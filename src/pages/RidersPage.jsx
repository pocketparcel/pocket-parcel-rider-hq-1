import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiEdit2, FiGrid, FiList, FiPlayCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import DataTable from '../components/data-table/DataTable'
import { adminApi } from '../config/api'
import { adminTableAutoRefresh, getAutoRefreshMs } from '../config/app'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const ONBOARDING_LABELS = {
  pending: 'Pending',
  personal_details: 'Personal details',
  vehicle_info: 'Vehicle info',
  vehicle_documents: 'Vehicle documents',
  identity_documents: 'Identity documents',
  verification: 'Verification',
  welcome_kit: 'Welcome kit',
  completed: 'Completed',
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

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

function StatusPill({ active, online }) {
  if (online) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
        Online
      </span>
    )
  }
  if (active) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
        Offline
      </span>
    )
  }
  return (
    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
      Inactive
    </span>
  )
}

function OnboardingPill({ status }) {
  const label = ONBOARDING_LABELS[status] ?? displayValue(status)
  const completed = status === 'completed'
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {label}
    </span>
  )
}

function BlockedPill() {
  return (
    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
      Blocked today
    </span>
  )
}

function normalizeRider(rider) {
  const vehicleTypeName =
    rider.vehicleTypeRef?.name ?? rider.vehicleType ?? rider.vehicle_type ?? '—'
  const vehicleBrandName = rider.vehicleBrandRef?.name ?? '—'
  const vehicleModelName = rider.vehicleModelRef?.name ?? '—'
  const orderCount = rider._count?.assignedOrders ?? 0

  return {
    id: rider.id,
    fullName: rider.fullName ?? rider.full_name ?? '—',
    phone: rider.phone ?? '—',
    email: rider.email,
    dateOfBirth: rider.dateOfBirth ?? rider.date_of_birth,
    gender: rider.gender,
    onboardingStatus: rider.onboardingStatus ?? rider.onboarding_status ?? 'pending',
    welcomeKitAcknowledged: rider.welcomeKitAcknowledged ?? rider.welcome_kit_acknowledged,
    permissionsGranted: rider.permissionsGranted ?? rider.permissions_granted,
    isActive: rider.isActive ?? rider.is_active ?? false,
    isOnline: rider.isOnline ?? rider.is_online ?? false,
    location: rider.location,
    rating: rider.rating,
    vehicleTypeName,
    vehicleTypeIconKey: rider.vehicleTypeRef?.iconKey,
    vehicleBrandName,
    vehicleModelName,
    vehicleNumber: rider.vehicleNumber ?? rider.vehicle_number,
    drivingLicenseNumber: rider.drivingLicenseNumber ?? rider.driving_license_number,
    aadhaarNumber: rider.aadhaarNumber ?? rider.aadhaar_number,
    panNumber: rider.panNumber ?? rider.pan_number,
    dlFrontUrl: rider.dlFrontUrl ?? rider.dl_front_url,
    dlBackUrl: rider.dlBackUrl ?? rider.dl_back_url,
    rcUrl: rider.rcUrl ?? rider.rc_url,
    aadhaarFrontUrl: rider.aadhaarFrontUrl ?? rider.aadhaar_front_url,
    aadhaarBackUrl: rider.aadhaarBackUrl ?? rider.aadhaar_back_url,
    panUrl: rider.panUrl ?? rider.pan_url,
    orderCount,
    createdAt: rider.createdAt ?? rider.created_at,
    updatedAt: rider.updatedAt ?? rider.updated_at,
    consecutiveOrderRejections: rider.consecutiveOrderRejections ?? 0,
    isDispatchBlocked: rider.isDispatchBlocked === true,
    dispatchBlockedUntil: rider.dispatchBlockedUntil ?? null,
  }
}

function riderVehicleSummary(rider) {
  const parts = [rider.vehicleTypeName]
  if (rider.vehicleBrandName !== '—') {
    parts.push(`${rider.vehicleBrandName} / ${rider.vehicleModelName}`)
  }
  return parts.filter((part) => part && part !== '—').join(' · ')
}

function RiderCard({ rider, onResume, resumingId }) {
  const vehicle = riderVehicleSummary(rider)

  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{rider.fullName}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-600">{displayValue(rider.phone)}</p>
          {vehicle ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{vehicle}</p>
          ) : null}
          {rider.isDispatchBlocked ? (
            <p className="mt-1 text-[11px] text-rose-700">
              {rider.consecutiveOrderRejections} reject
              {rider.consecutiveOrderRejections === 1 ? '' : 's'} · until{' '}
              {formatDate(rider.dispatchBlockedUntil)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill active={rider.isActive} online={rider.isOnline} />
          {rider.isDispatchBlocked ? <BlockedPill /> : null}
          <OnboardingPill status={rider.onboardingStatus} />
        </div>
      </div>
      {onResume ? (
        <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            disabled={resumingId === rider.id}
            onClick={() => onResume(rider)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
          >
            <FiPlayCircle className="text-sm" />
            {resumingId === rider.id ? 'Resuming...' : 'Resume'}
          </button>
          <Link
            to={`/riders/${rider.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
          >
            <FiEdit2 className="text-sm" />
            Edit
          </Link>
        </div>
      ) : null}
    </article>
  )
}

function buildRiderColumns({ onResume, resumingId, isBlockedTab = false } = {}) {
  const allRiderColumns = [
    {
      key: 'fullName',
      label: 'Name',
      sticky: isBlockedTab ? undefined : 'left',
      getSortValue: (row) => row.fullName,
      getSearchValue: (row) =>
        [row.fullName, row.phone, row.email, row.vehicleTypeName, row.vehicleBrandName]
          .filter(Boolean)
          .join(' '),
      render: (row) => displayValue(row.fullName),
    },
    {
      key: 'phone',
      label: 'Phone',
      getSortValue: (row) => row.phone,
      render: (row) => displayValue(row.phone),
    },
    {
      key: 'email',
      label: 'Email',
      getSortValue: (row) => row.email,
      render: (row) => displayValue(row.email),
    },
    {
      key: 'dateOfBirth',
      label: 'DOB',
      getSortValue: (row) => row.dateOfBirth,
      render: (row) => displayValue(row.dateOfBirth),
    },
    {
      key: 'gender',
      label: 'Gender',
      getSortValue: (row) => row.gender,
      render: (row) => displayValue(row.gender),
    },
    {
      key: 'onboardingStatus',
      label: 'Onboarding',
      getSortValue: (row) => row.onboardingStatus,
      getSearchValue: (row) => ONBOARDING_LABELS[row.onboardingStatus] ?? row.onboardingStatus,
      render: (row) => <OnboardingPill status={row.onboardingStatus} />,
      getExportValue: (row) => ONBOARDING_LABELS[row.onboardingStatus] ?? row.onboardingStatus,
    },
    {
      key: 'status',
      label: 'Status',
      getSortValue: (row) => (row.isOnline ? 2 : row.isActive ? 1 : 0),
      getSearchValue: (row) =>
        row.isOnline ? 'online' : row.isActive ? 'offline' : 'inactive',
      render: (row) => <StatusPill active={row.isActive} online={row.isOnline} />,
      getExportValue: (row) =>
        row.isOnline ? 'Online' : row.isActive ? 'Offline' : 'Inactive',
    },
    {
      key: 'vehicleTypeName',
      label: 'Vehicle type',
      getSortValue: (row) => row.vehicleTypeName,
      render: (row) => displayValue(row.vehicleTypeName),
    },
    {
      key: 'vehicleBrandName',
      label: 'Brand',
      getSortValue: (row) => row.vehicleBrandName,
      render: (row) => displayValue(row.vehicleBrandName),
    },
    {
      key: 'vehicleModelName',
      label: 'Model',
      getSortValue: (row) => row.vehicleModelName,
      render: (row) => displayValue(row.vehicleModelName),
    },
    {
      key: 'vehicleNumber',
      label: 'Vehicle no.',
      getSortValue: (row) => row.vehicleNumber,
      render: (row) => displayValue(row.vehicleNumber),
    },
    {
      key: 'drivingLicenseNumber',
      label: 'DL no.',
      getSortValue: (row) => row.drivingLicenseNumber,
      render: (row) => displayValue(row.drivingLicenseNumber),
    },
    {
      key: 'aadhaarNumber',
      label: 'Aadhaar',
      getSortValue: (row) => row.aadhaarNumber,
      render: (row) => displayValue(row.aadhaarNumber),
    },
    {
      key: 'panNumber',
      label: 'PAN',
      getSortValue: (row) => row.panNumber,
      render: (row) => displayValue(row.panNumber),
    },
    {
      key: 'location',
      label: 'Location',
      getSortValue: (row) => row.location,
      render: (row) => displayValue(row.location),
    },
    {
      key: 'rating',
      label: 'Rating',
      getSortValue: (row) => row.rating ?? -1,
      render: (row) => (row.rating != null ? row.rating.toFixed(1) : '—'),
    },
    {
      key: 'orderCount',
      label: 'Orders',
      getSortValue: (row) => row.orderCount,
      render: (row) => row.orderCount,
    },
    {
      key: 'welcomeKitAcknowledged',
      label: 'Kit',
      getSortValue: (row) => row.welcomeKitAcknowledged,
      render: (row) => yesNo(row.welcomeKitAcknowledged),
      getExportValue: (row) => yesNo(row.welcomeKitAcknowledged),
    },
    {
      key: 'permissionsGranted',
      label: 'Perms',
      getSortValue: (row) => row.permissionsGranted,
      render: (row) => yesNo(row.permissionsGranted),
      getExportValue: (row) => yesNo(row.permissionsGranted),
    },
    {
      key: 'dispatchStatus',
      label: 'Dispatch',
      enableSort: false,
      getSearchValue: (row) => (row.isDispatchBlocked ? 'blocked' : 'active'),
      render: (row) =>
        row.isDispatchBlocked ? <BlockedPill /> : (
          <span className="text-xs text-slate-500">Active</span>
        ),
      getExportValue: (row) => (row.isDispatchBlocked ? 'Blocked today' : 'Active'),
    },
    {
      key: 'createdAt',
      label: 'Created',
      getSortValue: (row) => row.createdAt,
      render: (row) => formatDate(row.createdAt),
      getExportValue: (row) => formatDate(row.createdAt),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      getSortValue: (row) => row.updatedAt,
      render: (row) => formatDate(row.updatedAt),
      getExportValue: (row) => formatDate(row.updatedAt),
    },
  ]

  const baseColumns = isBlockedTab
    ? allRiderColumns.filter((col) =>
        ['fullName', 'phone', 'onboardingStatus', 'status', 'vehicleTypeName', 'location', 'orderCount'].includes(
          col.key,
        ),
      )
    : allRiderColumns

  const blockedColumns = [
    {
      key: 'consecutiveOrderRejections',
      label: 'Rejects',
      getSortValue: (row) => row.consecutiveOrderRejections,
      render: (row) => row.consecutiveOrderRejections,
    },
    {
      key: 'dispatchBlockedUntil',
      label: 'Blocked until',
      getSortValue: (row) => row.dispatchBlockedUntil,
      render: (row) => formatDate(row.dispatchBlockedUntil),
      getExportValue: (row) => formatDate(row.dispatchBlockedUntil),
    },
    {
      key: 'dispatchStatus',
      label: 'Dispatch',
      enableSort: false,
      getSearchValue: () => 'blocked',
      render: () => <BlockedPill />,
      getExportValue: () => 'Blocked today',
    },
  ]

  const actionColumn = {
    key: 'actions',
    label: 'Actions',
    sticky: isBlockedTab ? undefined : 'right',
    defaultVisible: true,
    enableSort: false,
    getSearchValue: () => '',
    render: (row) => (
      <div className="flex items-center gap-1">
        {onResume ? (
          <button
            type="button"
            disabled={resumingId === row.id}
            onClick={() => onResume(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
          >
            <FiPlayCircle className="text-sm" />
            {resumingId === row.id ? 'Resuming...' : 'Resume'}
          </button>
        ) : null}
        <Link
          to={`/riders/${row.id}/edit`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
        >
          <FiEdit2 className="text-sm" />
          Edit
        </Link>
      </div>
    ),
    getExportValue: () => '',
  }

  return [...baseColumns, ...(onResume ? blockedColumns : []), actionColumn]
}

function RidersPage({
  riders = [],
  loading = false,
  adminToken,
  onUnauthorized,
  dataMode = 'client',
}) {
  const [viewMode, setViewMode] = useState('list')
  const [activeTab, setActiveTab] = useState('all')
  const [serverRows, setServerRows] = useState([])
  const [serverTotalRows, setServerTotalRows] = useState(0)
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [resumingId, setResumingId] = useState('')
  const [bulkResuming, setBulkResuming] = useState(false)
  const [selectedRiderKeys, setSelectedRiderKeys] = useState([])
  const [tableKey, setTableKey] = useState(0)

  const items = useMemo(() => {
    const source = dataMode === 'server' ? serverRows : riders
    return (source ?? []).map(normalizeRider)
  }, [dataMode, serverRows, riders])

  const controllerRef = useRef(null)
  const silentControllerRef = useRef(null)
  const lastQueryRef = useRef(null)
  const ridersRefreshMs = getAutoRefreshMs(adminTableAutoRefresh.ridersSeconds)
  const isServerMode = dataMode === 'server'
  const isLoading = isServerMode ? serverLoading : loading
  const isBlockedTab = activeTab === 'blocked'

  const fetchServerPage = useCallback(
    async (query, { silent = false } = {}) => {
      if (dataMode !== 'server') return
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
          setServerLoading(true)
          setServerError('')
        }

        const url = new URL(adminApi.ridersPaged)
        url.searchParams.set('page', query.page)
        url.searchParams.set('pageSize', query.pageSize)
        if (query.search !== undefined) url.searchParams.set('search', query.search)
        if (query.sortBy) url.searchParams.set('sortBy', query.sortBy)
        if (query.sortDir) url.searchParams.set('sortDir', query.sortDir)
        if (isBlockedTab) url.searchParams.set('dispatchBlocked', 'blocked')

        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
        const response = await fetch(url.toString(), { signal: controller.signal, headers })

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
        setServerRows(Array.isArray(data.items) ? data.items : [])
        setServerTotalRows(Number(data.meta?.total ?? 0))
      } catch (err) {
        if (err.name !== 'AbortError' && !silent) {
          setServerRows([])
          setServerTotalRows(0)
          setServerError(err.message || 'Failed to load riders')
        }
      } finally {
        if (!silent) {
          setServerLoading(false)
        }
      }
    },
    [adminToken, dataMode, isBlockedTab, onUnauthorized],
  )

  const refreshCurrentPage = useCallback(() => {
    if (lastQueryRef.current) {
      fetchServerPage(lastQueryRef.current, { silent: true })
    }
  }, [fetchServerPage])

  useAutoRefresh({
    enabled:
      Boolean(adminToken) &&
      isServerMode &&
      viewMode === 'list' &&
      ridersRefreshMs > 0,
    intervalMs: ridersRefreshMs,
    onRefresh: refreshCurrentPage,
  })

  const resumeRiderById = useCallback(
    async (riderId) => {
      const response = await fetch(adminApi.resumeRiderDispatch(riderId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.status === 401) {
        onUnauthorized?.()
        throw new Error('Unauthorized')
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`)
      }
      return payload
    },
    [adminToken, onUnauthorized],
  )

  const handleResume = useCallback(
    async (row) => {
      if (!adminToken || !row?.id) return
      try {
        setResumingId(row.id)
        setServerError('')
        setSuccess('')
        await resumeRiderById(row.id)
        setSuccess(`${row.fullName} can receive orders again`)
        if (lastQueryRef.current) {
          await fetchServerPage(lastQueryRef.current)
        }
      } catch (err) {
        if (err.message !== 'Unauthorized') {
          setServerError(err.message || 'Failed to resume rider')
        }
      } finally {
        setResumingId('')
      }
    },
    [adminToken, fetchServerPage, resumeRiderById],
  )

  const handleBulkResume = useCallback(async () => {
    if (!adminToken || selectedRiderKeys.length === 0 || bulkResuming) return

    try {
      setBulkResuming(true)
      setServerError('')
      setSuccess('')

      const results = await Promise.allSettled(
        selectedRiderKeys.map((riderId) => resumeRiderById(riderId)),
      )

      const succeeded = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.length - succeeded

      if (succeeded === 0) {
        const firstError = results.find((result) => result.status === 'rejected')
        throw new Error(
          firstError?.reason?.message || 'Failed to resume selected riders',
        )
      }

      if (failed === 0) {
        setSuccess(
          succeeded === 1
            ? '1 rider can receive orders again'
            : `${succeeded} riders can receive orders again`,
        )
      } else {
        setSuccess(`${succeeded} resumed, ${failed} failed`)
      }

      setSelectedRiderKeys([])
      setTableKey((value) => value + 1)
      if (lastQueryRef.current) {
        await fetchServerPage(lastQueryRef.current)
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        setServerError(err.message || 'Failed to resume selected riders')
      }
    } finally {
      setBulkResuming(false)
    }
  }, [
    adminToken,
    bulkResuming,
    fetchServerPage,
    resumeRiderById,
    selectedRiderKeys,
  ])

  const handleSelectionChange = useCallback(({ keys }) => {
    setSelectedRiderKeys(keys)
  }, [])

  const columns = useMemo(
    () =>
      buildRiderColumns({
        onResume: isBlockedTab ? handleResume : undefined,
        resumingId,
        isBlockedTab,
      }),
    [handleResume, isBlockedTab, resumingId],
  )

  useEffect(() => {
    return () => {
      controllerRef.current?.abort?.()
      silentControllerRef.current?.abort?.()
    }
  }, [])

  useEffect(() => {
    setSelectedRiderKeys([])
    setTableKey((value) => value + 1)
  }, [activeTab])

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-semibold leading-none text-slate-900">Riders</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage riders, review dispatch blocks, and resume order delivery access.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'list'
                ? 'bg-brand-orange text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FiList className="text-sm" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'cards'
                ? 'bg-brand-orange text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FiGrid className="text-sm" />
            Cards
          </button>
        </div>
      </div>

      <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'all'
              ? 'bg-brand-orange text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All riders
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blocked')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'blocked'
              ? 'bg-brand-orange text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Blocked today
        </button>
      </div>

      {serverError ? (
        <p className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}
      {success ? (
        <p className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {isBlockedTab && viewMode === 'list' && selectedRiderKeys.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-sm font-medium text-emerald-900">
            {selectedRiderKeys.length} rider{selectedRiderKeys.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRiderKeys([])
                setTableKey((value) => value + 1)
              }}
              disabled={bulkResuming}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleBulkResume}
              disabled={bulkResuming}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <FiPlayCircle className="text-sm" />
              {bulkResuming ? 'Resuming...' : 'Resume selected'}
            </button>
          </div>
        </div>
      ) : null}

      {viewMode === 'list' ? (
        <DataTable
          key={`riders-${activeTab}-${tableKey}`}
          className="min-h-0 flex-1"
          columns={columns}
          data={items}
          rowKey="id"
          loading={isLoading}
          emptyMessage={
            isBlockedTab
              ? 'No riders are blocked from receiving orders today.'
              : 'No riders registered yet.'
          }
          searchPlaceholder={
            isBlockedTab
              ? 'Search blocked riders by name, phone, vehicle...'
              : 'Search riders by name, phone, vehicle, status...'
          }
          exportFileName={isBlockedTab ? 'blocked-riders' : 'pocket-parcel-riders'}
          minWidth={isBlockedTab ? undefined : 1800}
          fullWidth={isBlockedTab}
          maxHeight="100%"
          defaultPageSize={25}
          enableRowSelection={isBlockedTab}
          onSelectionChange={isBlockedTab ? handleSelectionChange : undefined}
          dataMode={dataMode}
          serverTotalRows={dataMode === 'server' ? serverTotalRows : undefined}
          onQueryChange={dataMode === 'server' ? fetchServerPage : undefined}
        />
      ) : isLoading ? (
        <p className="text-sm text-slate-500">Loading riders...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {isBlockedTab
            ? 'No riders are blocked from receiving orders today.'
            : 'No riders registered yet.'}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((rider) => (
            <RiderCard
              key={rider.id}
              rider={rider}
              onResume={isBlockedTab ? handleResume : undefined}
              resumingId={resumingId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default RidersPage
