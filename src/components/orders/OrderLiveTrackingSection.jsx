import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiMapPin, FiNavigation, FiRefreshCw } from 'react-icons/fi'
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api'
import { adminApi } from '../../config/api'
import { googleMapsApiKey } from '../../config/app'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_CONTAINER_STYLE,
  MAP_OPTIONS,
  createPointMarkerIcon,
  createRiderMarkerIcon,
  fitMapToPoints,
} from '../../utils/googleMaps'

const TRACKING_REFRESH_MS = 10_000

const STAGE_LABELS = {
  accepted: 'Heading to pickup',
  picked_up: 'Picked up',
  verified: 'At pickup',
  awaiting_payment: 'Awaiting payment',
  paid: 'En route to delivery',
  delivered: 'Delivered',
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
    second: '2-digit',
  })
}

function hasCoords(point) {
  return point?.lat != null && point?.lng != null
}

function OrderTrackingMap({ tracking }) {
  const [map, setMap] = useState(null)
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey })

  const riderPosition = hasCoords(tracking?.rider)
    ? { lat: Number(tracking.rider.lat), lng: Number(tracking.rider.lng) }
    : null

  const destinationPosition = hasCoords(tracking?.destination)
    ? { lat: Number(tracking.destination.lat), lng: Number(tracking.destination.lng) }
    : null

  const pickupPosition = hasCoords(tracking?.pickup)
    ? { lat: Number(tracking.pickup.lat), lng: Number(tracking.pickup.lng) }
    : null

  const mapPoints = useMemo(() => {
    return [riderPosition, destinationPosition, pickupPosition].filter(Boolean)
  }, [destinationPosition, pickupPosition, riderPosition])

  const hasFittedBounds = useRef(false)

  useEffect(() => {
    if (!map) return
    if (mapPoints.length === 0) {
      hasFittedBounds.current = false
      map.setCenter(DEFAULT_MAP_CENTER)
      map.setZoom(DEFAULT_MAP_ZOOM)
      return
    }
    if (!hasFittedBounds.current) {
      fitMapToPoints(map, mapPoints)
      hasFittedBounds.current = true
    }
  }, [map, mapPoints])

  if (!googleMapsApiKey) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-slate-600">
        Configure <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> to
        show live tracking.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-rose-700">
        Failed to load Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-slate-500">
        Loading map…
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={riderPosition ?? destinationPosition ?? pickupPosition ?? DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      options={MAP_OPTIONS}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
    >
      {pickupPosition ? (
        <Marker
          position={pickupPosition}
          icon={createPointMarkerIcon('#10b981')}
          title={tracking.pickup?.label || 'Pickup'}
        />
      ) : null}

      {destinationPosition &&
      (!pickupPosition ||
        pickupPosition.lat !== destinationPosition.lat ||
        pickupPosition.lng !== destinationPosition.lng) ? (
        <Marker
          position={destinationPosition}
          icon={createPointMarkerIcon('#144a99')}
          title={tracking.destination?.label || 'Destination'}
        />
      ) : null}

      {riderPosition ? (
        <Marker
          position={riderPosition}
          icon={createRiderMarkerIcon(tracking.rider?.heading)}
          title={tracking.rider?.name || 'Rider'}
        />
      ) : null}

      {riderPosition && destinationPosition ? (
        <Polyline
          path={[riderPosition, destinationPosition]}
          options={{
            strokeColor: '#ff8a22',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          }}
        />
      ) : null}
    </GoogleMap>
  )
}

export function canShowOrderLiveTracking(order) {
  return Boolean(
    order?.assignedRiderId &&
      order.status === 'in_transit' &&
      order.riderFlowStage !== 'delivered',
  )
}

export default function OrderLiveTrackingSection({ orderId, adminToken, onUnauthorized }) {
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const onUnauthorizedRef = useRef(onUnauthorized)
  onUnauthorizedRef.current = onUnauthorized

  const loadTracking = useCallback(
    async ({ silent = false } = {}) => {
      if (!adminToken || !orderId) return

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        if (!silent) setError('')
        const response = await fetch(adminApi.orderTracking(orderId), {
          headers: { Authorization: `Bearer ${adminToken}` },
        })

        if (response.status === 401) {
          onUnauthorizedRef.current?.()
          return
        }

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.message || 'Failed to load live tracking')
        }

        setTracking(payload.data ?? null)
      } catch (err) {
        if (!silent) setError(err.message || 'Failed to load live tracking')
      } finally {
        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [adminToken, orderId],
  )

  useEffect(() => {
    loadTracking()
  }, [loadTracking])

  const silentRefresh = useCallback(() => {
    loadTracking({ silent: true })
  }, [loadTracking])

  useAutoRefresh({
    enabled: Boolean(adminToken && orderId),
    intervalMs: TRACKING_REFRESH_MS,
    onRefresh: silentRefresh,
  })

  const hasRiderLocation = hasCoords(tracking?.rider)

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiNavigation size={16} className="text-brand-orange" />
            Live rider tracking
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Updates every {TRACKING_REFRESH_MS / 1000}s while the order is active.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadTracking()}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <FiRefreshCw size={13} className={loading || refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-[13px] text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative min-h-[320px] border-b border-slate-100 xl:border-b-0 xl:border-r">
          <OrderTrackingMap tracking={tracking} />

          {!loading && !hasRiderLocation ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/75 p-6 text-center">
              <div>
                <FiMapPin size={24} className="mx-auto text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Waiting for rider GPS</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {tracking?.message || 'Location will appear once the rider app sends an update.'}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 p-5 text-[13px] text-slate-700">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rider</p>
            <p className="mt-1 font-semibold text-slate-900">{tracking?.rider?.name ?? '—'}</p>
            {tracking?.rider?.phone ? <p className="mt-0.5 text-slate-500">{tracking.rider.phone}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stage</p>
              <p className="mt-1 font-medium text-slate-900">
                {STAGE_LABELS[tracking?.stage] ?? tracking?.stage ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ETA</p>
              <p className="mt-1 font-medium text-slate-900">
                {tracking?.etaMinutes != null ? `${tracking.etaMinutes} min` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Distance left</p>
              <p className="mt-1 font-medium text-slate-900">
                {tracking?.distanceRemainingKm != null ? `${tracking.distanceRemainingKm} km` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last update</p>
              <p className="mt-1 font-medium text-slate-900">
                {formatDateTime(tracking?.rider?.updatedAt)}
              </p>
            </div>
          </div>

          {tracking?.destination ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current destination</p>
              <p className="mt-1 font-medium text-slate-900">{tracking.destination.label || '—'}</p>
              {tracking.destination.address ? (
                <p className="mt-1 text-[12px] leading-5 text-slate-500">{tracking.destination.address}</p>
              ) : null}
            </div>
          ) : null}

          {hasRiderLocation ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-600">
              {Number(tracking.rider.lat).toFixed(6)}, {Number(tracking.rider.lng).toFixed(6)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
