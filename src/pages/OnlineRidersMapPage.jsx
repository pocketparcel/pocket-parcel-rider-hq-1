import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiExternalLink, FiMapPin, FiNavigation, FiRefreshCw } from 'react-icons/fi'
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api'
import { Link } from 'react-router-dom'
import { adminApi } from '../config/api'
import { adminTableAutoRefresh, getAutoRefreshMs, googleMapsApiKey } from '../config/app'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
const DEFAULT_ZOOM = 5
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
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

function formatVehicle(rider) {
  const parts = [rider.vehicleType, rider.vehicleBrand, rider.vehicleModel].filter(Boolean)
  if (parts.length === 0) return rider.vehicleNumber || '—'
  const label = parts.join(' · ')
  return rider.vehicleNumber ? `${label} (${rider.vehicleNumber})` : label
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return '—'
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
}

function createRiderMarkerIcon(blocked, heading) {
  if (!window.google?.maps?.SymbolPath) return undefined

  return {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: blocked ? '#e11d48' : '#ff8a22',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    rotation: Number.isFinite(heading) ? heading : 0,
  }
}

function RiderInfoContent({ rider }) {
  return (
    <div className="min-w-[220px] space-y-2 text-[12px] text-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900">{rider.fullName}</p>
        <p className="text-slate-500">{rider.phone}</p>
      </div>

      <div className="space-y-1">
        <p>
          <span className="font-medium text-slate-500">Vehicle:</span> {formatVehicle(rider)}
        </p>
        <p>
          <span className="font-medium text-slate-500">GPS:</span> {formatCoords(rider.lat, rider.lng)}
        </p>
        {rider.accuracyMeters != null ? (
          <p>
            <span className="font-medium text-slate-500">Accuracy:</span>{' '}
            {Math.round(rider.accuracyMeters)} m
          </p>
        ) : null}
        {rider.locationLabel ? (
          <p>
            <span className="font-medium text-slate-500">Area:</span> {rider.locationLabel}
          </p>
        ) : null}
        <p>
          <span className="font-medium text-slate-500">Updated:</span> {formatDateTime(rider.lastLocationAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rider.isDispatchBlocked ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            Dispatch blocked
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Available
          </span>
        )}
        {!rider.isApproved ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Not approved
          </span>
        ) : null}
      </div>

      <Link
        to={`/riders/${rider.id}/edit`}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-orange hover:underline"
      >
        View rider profile
        <FiExternalLink size={12} />
      </Link>
    </div>
  )
}

function GoogleRidersMap({ riders }) {
  const [map, setMap] = useState(null)
  const [activeRiderId, setActiveRiderId] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey,
  })

  const activeRider = useMemo(
    () => riders.find((rider) => rider.id === activeRiderId) ?? null,
    [activeRiderId, riders],
  )

  useEffect(() => {
    if (!map || !window.google?.maps) return

    if (riders.length === 0) {
      map.setCenter(DEFAULT_CENTER)
      map.setZoom(DEFAULT_ZOOM)
      return
    }

    const bounds = new window.google.maps.LatLngBounds()
    for (const rider of riders) {
      bounds.extend({ lat: Number(rider.lat), lng: Number(rider.lng) })
    }
    map.fitBounds(bounds, 48)
  }, [map, riders])

  if (!googleMapsApiKey) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-slate-600">
        Set <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">rider_ui/.env</code> to load the map.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-rose-700">
        Failed to load Google Maps. Check your API key and billing settings.
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
    <>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={MAP_OPTIONS}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        onClick={() => setActiveRiderId(null)}
      >
        {riders.map((rider) => (
          <Marker
            key={rider.id}
            position={{ lat: Number(rider.lat), lng: Number(rider.lng) }}
            icon={createRiderMarkerIcon(rider.isDispatchBlocked, rider.heading)}
            onClick={() => setActiveRiderId(rider.id)}
          />
        ))}

        {activeRider ? (
          <InfoWindow
            position={{ lat: Number(activeRider.lat), lng: Number(activeRider.lng) }}
            onCloseClick={() => setActiveRiderId(null)}
          >
            <RiderInfoContent rider={activeRider} />
          </InfoWindow>
        ) : null}
      </GoogleMap>
    </>
  )
}

function StatCard({ label, value, hint, tone = 'slate' }) {
  const toneClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
    slate: 'border-slate-200 bg-white text-slate-800',
  }

  return (
    <article className={`rounded-xl border px-4 py-3 ${toneClasses[tone] ?? toneClasses.slate}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] opacity-70">{hint}</p> : null}
    </article>
  )
}

export default function OnlineRidersMapPage({ adminToken, onUnauthorized }) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  const refreshMs = getAutoRefreshMs(adminTableAutoRefresh.mapSeconds)

  const loadLocations = useCallback(async () => {
    if (!adminToken) return

    try {
      setError('')
      const response = await fetch(adminApi.onlineRiderLocations, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 401) {
        onUnauthorized?.()
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load online rider locations')
      }

      const body = await response.json()
      setPayload(body.data ?? null)
      setLastRefreshedAt(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load online rider locations')
    } finally {
      setLoading(false)
    }
  }, [adminToken, onUnauthorized])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  useAutoRefresh({
    enabled: Boolean(adminToken),
    intervalMs: refreshMs,
    onRefresh: loadLocations,
  })

  const ridersWithLocation = useMemo(
    () => (payload?.items ?? []).filter((rider) => rider.hasLocation),
    [payload],
  )

  const ridersWithoutLocation = useMemo(
    () => (payload?.items ?? []).filter((rider) => !rider.hasLocation),
    [payload],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Live Rider Map</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Real-time GPS positions for riders currently online in the app.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLocations}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Online riders"
          value={payload?.totalOnline ?? (loading ? '…' : 0)}
          hint="Active and marked online"
          tone="orange"
        />
        <StatCard
          label="On map"
          value={payload?.withLocation ?? (loading ? '…' : 0)}
          hint="Riders with GPS coordinates"
          tone="emerald"
        />
        <StatCard
          label="Missing GPS"
          value={payload?.withoutLocation ?? (loading ? '…' : 0)}
          hint="Online but no location yet"
          tone="amber"
        />
        <StatCard
          label="Last updated"
          value={lastRefreshedAt ? formatDateTime(lastRefreshedAt) : '—'}
          hint={refreshMs > 0 ? `Auto-refresh every ${refreshMs / 1000}s` : 'Auto-refresh disabled'}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
              <FiMapPin size={15} className="text-brand-orange" />
              Rider locations
            </div>
            <span className="text-[11px] text-slate-500">
              {ridersWithLocation.length} marker{ridersWithLocation.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="relative min-h-[360px] flex-1">
            <GoogleRidersMap riders={ridersWithLocation} />

            {!loading && ridersWithLocation.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/75 p-6 text-center">
                <div>
                  <FiNavigation size={28} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No riders with GPS on the map</p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {ridersWithoutLocation.length > 0
                      ? `${ridersWithoutLocation.length} online rider${ridersWithoutLocation.length === 1 ? ' is' : 's are'} listed on the right — GPS will appear after the rider app sends a location update.`
                      : 'Riders appear here once they go online and the app sends a location update.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex min-h-[280px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-slate-800">Online without GPS</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              These riders are online but have not reported coordinates yet.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="px-1 py-2 text-[12px] text-slate-500">Loading riders…</p>
            ) : ridersWithoutLocation.length === 0 ? (
              <p className="px-1 py-2 text-[12px] text-slate-500">All online riders have GPS on the map.</p>
            ) : (
              <ul className="space-y-2">
                {ridersWithoutLocation.map((rider) => (
                  <li
                    key={rider.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[12px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{rider.fullName}</p>
                        <p className="text-slate-500">{rider.phone}</p>
                      </div>
                      <Link
                        to={`/riders/${rider.id}/edit`}
                        className="shrink-0 text-[11px] font-semibold text-brand-orange hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                    {rider.locationLabel ? (
                      <p className="mt-1 text-slate-500">Last area: {rider.locationLabel}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
