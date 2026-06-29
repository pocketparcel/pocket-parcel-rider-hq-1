import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import DocumentImageField from '../components/riders/DocumentImageField'
import { adminApi } from '../config/api'
import { resolveDocumentUrl } from '../utils/resolveDocumentUrl'

const ONBOARDING_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'personal_details', label: 'Personal details' },
  { value: 'vehicle_info', label: 'Vehicle info' },
  { value: 'vehicle_documents', label: 'Vehicle documents' },
  { value: 'identity_documents', label: 'Identity documents' },
  { value: 'verification', label: 'Verification' },
  { value: 'welcome_kit', label: 'Welcome kit' },
  { value: 'completed', label: 'Completed' },
]

const DOCUMENT_FIELDS = [
  { key: 'dlFrontImage', urlKey: 'dlFrontUrl', label: 'Driving license (front)' },
  { key: 'dlBackImage', urlKey: 'dlBackUrl', label: 'Driving license (back)' },
  { key: 'rcImage', urlKey: 'rcUrl', label: 'Registration certificate (RC)' },
  { key: 'aadhaarFrontImage', urlKey: 'aadhaarFrontUrl', label: 'Aadhaar (front)' },
  { key: 'aadhaarBackImage', urlKey: 'aadhaarBackUrl', label: 'Aadhaar (back)' },
  { key: 'panImage', urlKey: 'panUrl', label: 'PAN card' },
]

const emptyDocuments = () =>
  Object.fromEntries(DOCUMENT_FIELDS.map((field) => [field.key, undefined]))

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-600">
      {children}
      {required ? <span className="text-rose-500"> *</span> : null}
    </label>
  )
}

function TextInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100 ${className}`}
      {...props}
    />
  )
}

function SelectInput({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function riderToForm(rider) {
  return {
    fullName: rider.fullName ?? '',
    phone: rider.phone ?? '',
    email: rider.email ?? '',
    dateOfBirth: rider.dateOfBirth ?? '',
    gender: rider.gender ?? '',
    vehicleTypeId: rider.vehicleTypeId ?? '',
    vehicleBrandId: rider.vehicleBrandId ?? '',
    vehicleModelId: rider.vehicleModelId ?? '',
    drivingLicenseNumber: rider.drivingLicenseNumber ?? '',
    vehicleNumber: rider.vehicleNumber ?? '',
    aadhaarNumber: rider.aadhaarNumber ?? '',
    panNumber: rider.panNumber ?? '',
    onboardingStatus: rider.onboardingStatus ?? 'pending',
    welcomeKitAcknowledged: Boolean(rider.welcomeKitAcknowledged),
    permissionsGranted: Boolean(rider.permissionsGranted),
    isApproved: Boolean(rider.isApproved),
    isActive: rider.isActive !== false,
    isOnline: Boolean(rider.isOnline),
    location: rider.location ?? '',
    rating: rider.rating ?? '',
  }
}

function riderToUrlMap(rider) {
  return Object.fromEntries(DOCUMENT_FIELDS.map((field) => [field.urlKey, rider[field.urlKey] ?? null]))
}

function EditRiderPage({ adminToken, onUnauthorized }) {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [initialForm, setInitialForm] = useState(null)
  const [form, setForm] = useState(null)
  const [initialUrls, setInitialUrls] = useState({})
  const [documents, setDocuments] = useState(emptyDocuments)
  const [vehicleTree, setVehicleTree] = useState([])

  const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
      if (response.status === 401) {
        onUnauthorized?.()
        return null
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`)
      }
      return payload.data
    },
    [adminToken, onUnauthorized],
  )

  const loadRider = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [rider, tree] = await Promise.all([
        apiFetch(adminApi.riderById(id)),
        apiFetch(adminApi.vehicleMastersTree),
      ])
      if (!rider) return

      const nextForm = riderToForm(rider)
      setForm(nextForm)
      setInitialForm(nextForm)
      setInitialUrls(riderToUrlMap(rider))
      setDocuments(emptyDocuments())
      setVehicleTree(Array.isArray(tree) ? tree : [])
    } catch (err) {
      setError(err.message || 'Failed to load rider')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, id])

  useEffect(() => {
    if (adminToken && id) loadRider()
  }, [adminToken, id, loadRider])

  const brandOptions = useMemo(() => {
    if (!form?.vehicleTypeId) return []
    const type = vehicleTree.find((item) => item.id === form.vehicleTypeId)
    return type?.brands ?? []
  }, [form?.vehicleTypeId, vehicleTree])

  const modelOptions = useMemo(() => {
    if (!form?.vehicleBrandId) return []
    const brand = brandOptions.find((item) => item.id === form.vehicleBrandId)
    return brand?.models ?? []
  }, [form?.vehicleBrandId, brandOptions])

  function updateForm(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'isApproved' && value === true) {
        next.isActive = true
      }
      if (key === 'isApproved' && value === false) {
        next.isActive = false
      }
      return next
    })
    setSuccess('')
  }

  function updateDocument(key, value) {
    setDocuments((prev) => ({ ...prev, [key]: value }))
    setSuccess('')
  }

  function getDocumentPreview(field) {
    const pending = documents[field.key]
    if (pending === null) return null
    if (typeof pending === 'string') {
      return pending.startsWith('data:') ? pending : resolveDocumentUrl(pending)
    }
    return resolveDocumentUrl(initialUrls[field.urlKey])
  }

  function buildPayload() {
    const payload = {}
    if (!form || !initialForm) return payload

    const scalarFields = [
      'fullName',
      'phone',
      'email',
      'dateOfBirth',
      'gender',
      'vehicleTypeId',
      'vehicleBrandId',
      'vehicleModelId',
      'drivingLicenseNumber',
      'vehicleNumber',
      'aadhaarNumber',
      'panNumber',
      'onboardingStatus',
      'welcomeKitAcknowledged',
      'permissionsGranted',
      'isApproved',
      'isActive',
      'isOnline',
      'location',
    ]

    for (const key of scalarFields) {
      if (form[key] !== initialForm[key]) {
        payload[key] = form[key] === '' ? null : form[key]
      }
    }

    const ratingValue = form.rating === '' || form.rating === null ? null : Number(form.rating)
    const initialRating =
      initialForm.rating === '' || initialForm.rating === null ? null : Number(initialForm.rating)
    if (ratingValue !== initialRating && !Number.isNaN(ratingValue)) {
      payload.rating = ratingValue
    } else if (ratingValue === null && initialRating !== null) {
      payload.rating = null
    }

    for (const field of DOCUMENT_FIELDS) {
      if (documents[field.key] !== undefined) {
        payload[field.key] = documents[field.key]
      }
    }

    return payload
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form) return

    const payload = buildPayload()
    if (Object.keys(payload).length === 0) {
      setError('No changes to save')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await apiFetch(adminApi.riderById(id), {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      if (!updated) return

      const nextForm = riderToForm(updated)
      setForm(nextForm)
      setInitialForm(nextForm)
      setInitialUrls(riderToUrlMap(updated))
      setDocuments(emptyDocuments())
      setSuccess('Rider updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update rider')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading rider...</p>
  }

  if (!form) {
    return (
      <section className="space-y-4">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error || 'Rider not found'}
        </p>
        <Link
          to="/riders"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-orange hover:underline"
        >
          <FiArrowLeft />
          Back to riders
        </Link>
      </section>
    )
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/riders"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-brand-orange"
          >
            <FiArrowLeft className="text-sm" />
            Back to riders
          </Link>
          <h1 className="text-[34px] font-semibold leading-none text-slate-900">Edit Rider</h1>
          <p className="mt-2 text-sm text-slate-600">
            Update profile, vehicle, status, and document images for {form.fullName || 'this rider'}.
          </p>
        </div>
        <button
          type="submit"
          form="edit-rider-form"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <FiSave />
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <form id="edit-rider-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Personal details</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel required>Full name</FieldLabel>
              <TextInput
                value={form.fullName}
                onChange={(e) => updateForm('fullName', e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel required>Phone</FieldLabel>
              <TextInput
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Date of birth</FieldLabel>
              <TextInput
                type="date"
                value={form.dateOfBirth ? String(form.dateOfBirth).slice(0, 10) : ''}
                onChange={(e) => updateForm('dateOfBirth', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <SelectInput value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <TextInput value={form.location} onChange={(e) => updateForm('location', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Vehicle</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel>Vehicle type</FieldLabel>
              <SelectInput
                value={form.vehicleTypeId}
                onChange={(e) => {
                  updateForm('vehicleTypeId', e.target.value)
                  updateForm('vehicleBrandId', '')
                  updateForm('vehicleModelId', '')
                }}
              >
                <option value="">—</option>
                {vehicleTree.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Brand</FieldLabel>
              <SelectInput
                value={form.vehicleBrandId}
                disabled={!form.vehicleTypeId}
                onChange={(e) => {
                  updateForm('vehicleBrandId', e.target.value)
                  updateForm('vehicleModelId', '')
                }}
              >
                <option value="">—</option>
                {brandOptions.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Model</FieldLabel>
              <SelectInput
                value={form.vehicleModelId}
                disabled={!form.vehicleBrandId}
                onChange={(e) => updateForm('vehicleModelId', e.target.value)}
              >
                <option value="">—</option>
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Vehicle number</FieldLabel>
              <TextInput
                value={form.vehicleNumber}
                onChange={(e) => updateForm('vehicleNumber', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Driving license number</FieldLabel>
              <TextInput
                value={form.drivingLicenseNumber}
                onChange={(e) => updateForm('drivingLicenseNumber', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Identity documents</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Aadhaar number</FieldLabel>
              <TextInput
                value={form.aadhaarNumber}
                onChange={(e) => updateForm('aadhaarNumber', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>PAN number</FieldLabel>
              <TextInput value={form.panNumber} onChange={(e) => updateForm('panNumber', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Document images</h2>
          <p className="mb-3 text-xs text-slate-500">
            Preview existing uploads, remove images, or replace them with a new file.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {DOCUMENT_FIELDS.map((field) => (
              <DocumentImageField
                key={field.key}
                label={field.label}
                previewSrc={getDocumentPreview(field)}
                disabled={saving}
                onUpload={(base64) => updateDocument(field.key, base64)}
                onRemove={() => updateDocument(field.key, null)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Status & onboarding</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>Onboarding status</FieldLabel>
              <SelectInput
                value={form.onboardingStatus}
                onChange={(e) => updateForm('onboardingStatus', e.target.value)}
              >
                {ONBOARDING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Rating</FieldLabel>
              <TextInput
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => updateForm('rating', e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isApproved}
                  onChange={(e) => updateForm('isApproved', e.target.checked)}
                  className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                Verified &amp; approved
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Approve onboarding after reviewing documents and profile details.
              </p>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  disabled={!form.isApproved}
                  onChange={(e) => updateForm('isActive', e.target.checked)}
                  className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange disabled:opacity-50"
                />
                Account active
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Disable to block login without revoking approval. Requires approval first.
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isOnline}
                  onChange={(e) => updateForm('isOnline', e.target.checked)}
                  className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                Online now
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.permissionsGranted}
                  onChange={(e) => updateForm('permissionsGranted', e.target.checked)}
                  className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                Permissions granted
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.welcomeKitAcknowledged}
                  onChange={(e) => updateForm('welcomeKitAcknowledged', e.target.checked)}
                  className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                Welcome kit acknowledged
              </label>
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}

export default EditRiderPage
