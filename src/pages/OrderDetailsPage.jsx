import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiRotateCcw,
  FiUser,
} from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import OrderLiveTrackingSection, {
  canShowOrderLiveTracking,
} from '../components/orders/OrderLiveTrackingSection'
import { adminApi } from '../config/api'

const STATUS_LABELS = {
  available: 'Available',
  in_transit: 'In transit',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

const DROP_STATUS_LABELS = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
}

const SOURCE_LABELS = {
  local: 'Local delivery',
  forward: 'Forward / warehouse',
}

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

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `Rs ${value}`
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return null
  return `${lat}, ${lng}`
}

function StatusPill({ status, labels = STATUS_LABELS }) {
  const styles = {
    available: 'bg-amber-50 text-amber-800 ring-amber-100',
    in_transit: 'bg-sky-50 text-sky-700 ring-sky-100',
    delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    pending: 'bg-slate-100 text-slate-700 ring-slate-200',
    failed: 'bg-rose-50 text-rose-700 ring-rose-100',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}
    >
      {labels[status] ?? displayValue(status)}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, hint, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
          <Icon size={18} />
        </span>
      </div>
    </div>
  )
}

function SectionCard({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function DetailGrid({ items }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-sm text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function AddressCard({ title, badge, address, contact, meta, coords }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          {badge ? <div className="mt-2">{badge}</div> : null}
        </div>
        {coords ? (
          <span className="rounded-md bg-white px-2 py-1 text-[10px] font-mono text-slate-500 ring-1 ring-slate-200">
            {coords}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">{displayValue(address?.name)}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{displayValue(address?.address || address?.label)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {[address?.city, address?.state, address?.pincode, address?.country].filter(Boolean).join(', ') ||
          '—'}
      </p>
      {address?.landmark ? <p className="mt-2 text-xs text-slate-500">Landmark: {address.landmark}</p> : null}
      {address?.hint ? <p className="mt-1 text-xs text-slate-500">{address.hint}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {contact?.phone ? <span>Phone: {contact.phone}</span> : null}
        {contact?.email ? <span>Email: {contact.email}</span> : null}
      </div>
      {meta ? <div className="mt-3 text-xs text-slate-500">{meta}</div> : null}
    </div>
  )
}

function RouteTimeline({ pickup, drops = [] }) {
  const stops = [
    {
      key: 'pickup',
      title: 'Pickup',
      subtitle: pickup?.name,
      body: pickup?.address || pickup?.label,
      meta: [pickup?.city, pickup?.state, pickup?.pincode].filter(Boolean).join(', '),
      tone: 'bg-emerald-500',
    },
    ...drops.map((drop) => ({
      key: drop.id,
      title: drops.length > 1 ? `Stop ${drop.sequence}` : 'Dropoff',
      subtitle: drop.name,
      body: drop.address,
      meta: [drop.city, drop.state, drop.pincode].filter(Boolean).join(', '),
      status: drop.status,
      tone: 'bg-brand-orange',
    })),
  ]

  return (
    <div className="space-y-0">
      {stops.map((stop, index) => (
        <div key={stop.key} className="relative flex gap-4 pb-6 last:pb-0">
          {index < stops.length - 1 ? (
            <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />
          ) : null}
          <span className={`relative z-[1] mt-1 h-6 w-6 shrink-0 rounded-full ring-4 ring-white ${stop.tone}`} />
          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stop.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{displayValue(stop.subtitle)}</p>
              </div>
              {stop.status ? <StatusPill status={stop.status} labels={DROP_STATUS_LABELS} /> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{displayValue(stop.body)}</p>
            {stop.meta ? <p className="mt-1 text-xs text-slate-500">{stop.meta}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function JsonPanel({ title, value }) {
  const [open, setOpen] = useState(false)
  if (value == null) return null

  return (
    <SectionCard title={title} description="Raw payload captured from the customer webhook.">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
      >
        {open ? 'Hide JSON' : 'Show JSON'}
      </button>
      {open ? (
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </SectionCard>
  )
}

function OrderDetailsPage({ adminToken, onUnauthorized }) {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [retriggering, setRetriggering] = useState(false)
  const [resetting, setResetting] = useState(false)

  const onUnauthorizedRef = useRef(onUnauthorized)
  onUnauthorizedRef.current = onUnauthorized

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return null
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`)
      }

      return { data: payload.data, message: payload.message }
    },
    [adminToken],
  )

  useEffect(() => {
    if (!adminToken || !id) return

    let cancelled = false

    async function loadOrder() {
      setLoading(true)
      setError('')
      try {
        const result = await apiFetch(adminApi.orderById(id))
        if (cancelled || !result) return
        setOrder(result.data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load order')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [adminToken, apiFetch, id])

  const handleReset = useCallback(async () => {
    if (!order?.id) return
    const label = order.orderNumber || order.id
    if (!window.confirm(`Reset rider flow for ${label} back to accepted?`)) return
    try {
      setResetting(true)
      setError('')
      setSuccess('')
      const result = await apiFetch(adminApi.resetOrderToAccepted(order.id), { method: 'POST' })
      if (!result) return
      setOrder(result.data?.order ?? order)
      setSuccess(result.message || 'Order reset to accepted')
    } catch (err) {
      setError(err.message || 'Failed to reset order')
    } finally {
      setResetting(false)
    }
  }, [apiFetch, order])

  const handleRetrigger = useCallback(async () => {
    if (!order?.id) return
    try {
      setRetriggering(true)
      setError('')
      setSuccess('')
      const result = await apiFetch(adminApi.retriggerOrderDispatch(order.id), { method: 'POST' })
      if (!result) return
      setOrder(result.data?.order ?? order)
      setSuccess(result.message || 'Order re-broadcast to riders')
    } catch (err) {
      setError(err.message || 'Failed to re-broadcast order')
    } finally {
      setRetriggering(false)
    }
  }, [apiFetch, order])

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading order details...
      </section>
    )
  }

  if (error || !order) {
    return (
      <section className="space-y-4">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-orange"
        >
          <FiArrowLeft />
          Back to orders
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || 'Order not found'}
        </div>
      </section>
    )
  }

  const hasWarehouse = Boolean(order.warehouse?.name || order.warehouse?.address)
  const pickupCoords = formatCoords(order.pickupDetails?.lat, order.pickupDetails?.lng)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-orange"
          >
            <FiArrowLeft />
            Back to orders
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[34px] font-semibold leading-none text-slate-900">
                {displayValue(order.orderNumber)}
              </h1>
              <StatusPill status={order.status} />
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
                {SOURCE_LABELS[order.sourceVariant] ?? order.sourceVariant}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Order ID: {order.id}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-slate-100 px-2 py-1">Customer: {displayValue(order.customerOrderStatus)}</span>
              {order.lifecycleStatus ? (
                <span className="rounded-md bg-slate-100 px-2 py-1">Lifecycle: {order.lifecycleStatus}</span>
              ) : null}
              <span className="rounded-md bg-slate-100 px-2 py-1">Payment: {displayValue(order.paymentStatus)}</span>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">
                Rider flow: {RIDER_FLOW_LABELS[order.riderFlowStage] ?? displayValue(order.riderFlowStage)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {order.canRetriggerDispatch ? (
            <button
              type="button"
              disabled={retriggering}
              onClick={handleRetrigger}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <FiRefreshCw className={retriggering ? 'animate-spin' : ''} />
              {retriggering ? 'Sending to riders...' : 'Re-broadcast to riders'}
            </button>
          ) : null}
          {order.canResetToAccepted ? (
            <button
              type="button"
              disabled={resetting}
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
            >
              <FiRotateCcw className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Resetting...' : 'Reset rider flow'}
            </button>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <p>
              Created: <span className="font-medium text-slate-900">{formatDate(order.createdAt)}</span>
            </p>
            {order.sourceCreatedAt ? (
              <p className="mt-1">
                Customer created:{' '}
                <span className="font-medium text-slate-900">{formatDate(order.sourceCreatedAt)}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {canShowOrderLiveTracking(order) ? (
        <OrderLiveTrackingSection
          orderId={order.id}
          adminToken={adminToken}
          onUnauthorized={onUnauthorized}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={FiCreditCard} label="Rider earning" value={formatMoney(order.earning)} />
        <SummaryCard
          icon={FiMapPin}
          label="Route distance"
          value={order.distanceKm != null ? `${order.distanceKm} km` : '—'}
          hint={`${order.dropCount} stop${order.dropCount === 1 ? '' : 's'}`}
        />
        <SummaryCard
          icon={FiClock}
          label="Est. duration"
          value={order.durationMin != null ? `${order.durationMin} min` : '—'}
        />
        <SummaryCard
          icon={FiPackage}
          label="Order total"
          value={formatMoney(order.totalAmount)}
          hint={displayValue(order.packageType)}
          tone="text-brand-orange"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SectionCard
          title="Delivery route"
          description="Pickup and all drop stops in sequence."
          className="min-w-0"
        >
          <RouteTimeline pickup={order.pickupDetails} drops={order.drops} />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Assigned rider" description="Rider currently linked to this order.">
            {order.assignedRider ? (
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <FiUser size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{order.assignedRider.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.assignedRider.phone}</p>
                  <Link
                    to={`/riders/${order.assignedRider.id}/edit`}
                    className="mt-3 inline-flex text-xs font-medium text-brand-orange hover:underline"
                  >
                    View rider profile
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No rider assigned yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Payment" description="Customer billing details from webhook.">
            <DetailGrid
              items={[
                { label: 'Mode', value: displayValue(order.paymentMode) },
                { label: 'Status', value: displayValue(order.paymentStatus) },
                { label: 'Gateway', value: displayValue(order.paymentGateway) },
                { label: 'Payment ID', value: displayValue(order.paymentId) },
                { label: 'Paid at', value: formatDate(order.paidAt) },
                { label: 'Total', value: formatMoney(order.totalAmount) },
                { label: 'Base', value: formatMoney(order.baseAmount) },
                { label: 'Delivery', value: formatMoney(order.deliveryAmount) },
                { label: 'Discount', value: formatMoney(order.discountAmount) },
                { label: 'COD', value: formatMoney(order.codAmount) },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Pickup details">
          <AddressCard
            title="Pickup location"
            address={order.pickupDetails}
            contact={{ phone: order.pickupDetails?.phone, email: order.pickupDetails?.email }}
            coords={pickupCoords}
            meta={
              order.pickupScheduledAt ? `Scheduled: ${formatDate(order.pickupScheduledAt)}` : null
            }
          />
        </SectionCard>

        <SectionCard title="Primary drop details">
          <AddressCard
            title="First drop"
            address={order.dropDetails}
            contact={{ phone: order.dropDetails?.phone, email: order.dropDetails?.email }}
            coords={formatCoords(order.dropDetails?.lat, order.dropDetails?.lng)}
          />
        </SectionCard>
      </div>

      {(hasWarehouse || order.customerOriginalPickup) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {hasWarehouse ? (
            <SectionCard title="Warehouse hub">
              <AddressCard
                title="Warehouse"
                address={{
                  name: order.warehouse.name,
                  address: order.warehouse.address,
                  hint: order.warehouse.hint,
                }}
                contact={{ phone: order.warehouse.phone, email: order.warehouse.email }}
                coords={formatCoords(order.warehouse.lat, order.warehouse.lng)}
              />
            </SectionCard>
          ) : null}

          {order.customerOriginalPickup ? (
            <SectionCard title="Customer original pickup">
              <AddressCard
                title="Original pickup"
                address={{
                  name: order.customerOriginalPickup.pickup_name || order.customerOriginalPickup.name,
                  address:
                    order.customerOriginalPickup.pickup_address || order.customerOriginalPickup.address,
                  city: order.customerOriginalPickup.pickup_city || order.customerOriginalPickup.city,
                  state: order.customerOriginalPickup.pickup_state || order.customerOriginalPickup.state,
                  pincode:
                    order.customerOriginalPickup.pickup_pincode || order.customerOriginalPickup.pincode,
                }}
                contact={{
                  phone:
                    order.customerOriginalPickup.pickup_phone || order.customerOriginalPickup.phone,
                  email: order.customerOriginalPickup.email,
                }}
              />
            </SectionCard>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Package" description="Parcel information for the rider.">
          <DetailGrid
            items={[
              { label: 'Package type', value: displayValue(order.package?.type) },
              { label: 'Description', value: displayValue(order.package?.description) },
              { label: 'Weight', value: displayValue(order.package?.weight) },
              { label: 'Dimensions (L×B×H)', value: [order.package?.length, order.package?.breadth, order.package?.height].filter(Boolean).join(' × ') || '—' },
              { label: 'Volumetric weight', value: displayValue(order.package?.volumetricWeight) },
              { label: 'Chargeable weight', value: displayValue(order.package?.chargeableWeight) },
              { label: 'Fragile', value: order.package?.isFragile ? 'Yes' : 'No' },
              { label: 'Special instructions', value: displayValue(order.package?.specialInstructions) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Order metadata">
          <DetailGrid
            items={[
              { label: 'Reference #', value: displayValue(order.referenceNumber) },
              { label: 'Customer order type', value: displayValue(order.customerOrderType) },
              { label: 'Order type', value: displayValue(order.orderType) },
              { label: 'User ID', value: displayValue(order.userId) },
              { label: 'Declared value', value: formatMoney(order.declaredValue) },
              { label: 'Courier partner', value: displayValue(order.courier?.partnerName) },
              { label: 'Marketplace', value: displayValue(order.courier?.marketplace) },
              { label: 'Qwqer delivery', value: order.courier?.useQwqerDelivery ? 'Yes' : 'No' },
              { label: 'Updated', value: formatDate(order.updatedAt) },
              { label: 'Source updated', value: formatDate(order.sourceUpdatedAt) },
            ]}
          />
        </SectionCard>
      </div>

      {order.additionalMetadata ? (
        <JsonPanel title="Additional metadata" value={order.additionalMetadata} />
      ) : null}

      {order.rawPayload ? <JsonPanel title="Raw webhook payload" value={order.rawPayload} /> : null}
    </section>
  )
}

export default OrderDetailsPage
