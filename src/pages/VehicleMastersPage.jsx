import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheck, FiEdit2, FiTrash2, FiX, FiXCircle } from 'react-icons/fi'
import { MaterialIcon } from '../components/icons/materialIconCatalog'
import IconKeySelect from '../components/icons/IconKeySelect'
import { adminApi } from '../config/api'

const emptyTypeForm = {
  name: '',
  code: '',
  customerAppVehicleType: '',
  description: '',
  iconKey: 'two_wheeler',
  sortOrder: 0,
}

function IconActionButton({ title, onClick, disabled, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

const TABS = [
  { key: 'types', label: 'Vehicle Types' },
  { key: 'brands', label: 'Vehicle Brands' },
  { key: 'models', label: 'Vehicle Models' },
]

function VehicleMastersPage({ adminToken, onUnauthorized }) {
  const [tab, setTab] = useState('types')
  const [types, setTypes] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [iconCatalog, setIconCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingTypeId, setEditingTypeId] = useState(null)
  const [typeForm, setTypeForm] = useState(emptyTypeForm)

  const vehicleIconOptions = useMemo(
    () => iconCatalog.filter((item) => item.group === 'vehicle'),
    [iconCatalog],
  )
  const [brandForm, setBrandForm] = useState({ name: '', vehicleTypeId: '' })
  const [modelForm, setModelForm] = useState({ name: '', brandId: '' })

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

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [typesData, brandsData, modelsData, catalogData] = await Promise.all([
        apiFetch(adminApi.vehicleTypes),
        apiFetch(adminApi.vehicleBrands),
        apiFetch(adminApi.vehicleModels),
        apiFetch(adminApi.iconCatalog),
      ])
      setTypes(Array.isArray(typesData) ? typesData : [])
      setBrands(Array.isArray(brandsData) ? brandsData : [])
      setModels(Array.isArray(modelsData) ? modelsData : [])
      setIconCatalog(Array.isArray(catalogData) ? catalogData : [])
    } catch (err) {
      setError(err.message || 'Failed to load vehicle masters')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken) loadAll()
  }, [adminToken, loadAll])

  function resetTypeForm() {
    setEditingTypeId(null)
    setTypeForm(emptyTypeForm)
  }

  function startEditType(item) {
    setEditingTypeId(item.id)
    setError('')
    setTypeForm({
      name: item.name ?? '',
      code: item.code ?? '',
      customerAppVehicleType: item.customerAppVehicleType ?? '',
      description: item.description ?? '',
      iconKey: item.iconKey ?? 'two_wheeler',
      sortOrder: item.sortOrder ?? 0,
    })
  }

  async function handleSubmitType(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...typeForm,
        sortOrder: Number(typeForm.sortOrder) || 0,
      }
      if (editingTypeId) {
        await apiFetch(`${adminApi.vehicleTypes}/${editingTypeId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(adminApi.vehicleTypes, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      resetTypeForm()
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateBrand(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch(adminApi.vehicleBrands, {
        method: 'POST',
        body: JSON.stringify({ ...brandForm, vehicleTypeId: brandForm.vehicleTypeId }),
      })
      setBrandForm({ name: '', vehicleTypeId: '' })
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateModel(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch(adminApi.vehicleModels, {
        method: 'POST',
        body: JSON.stringify({ ...modelForm, brandId: modelForm.brandId }),
      })
      setModelForm({ name: '', brandId: '' })
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(resource, item) {
    const urlMap = {
      types: `${adminApi.vehicleTypes}/${item.id}`,
      brands: `${adminApi.vehicleBrands}/${item.id}`,
      models: `${adminApi.vehicleModels}/${item.id}`,
    }
    setSaving(true)
    try {
      await apiFetch(urlMap[resource], {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(resource, item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    const urlMap = {
      types: `${adminApi.vehicleTypes}/${item.id}`,
      brands: `${adminApi.vehicleBrands}/${item.id}`,
      models: `${adminApi.vehicleModels}/${item.id}`,
    }
    setSaving(true)
    try {
      await apiFetch(urlMap[resource], { method: 'DELETE' })
      if (resource === 'types' && editingTypeId === item.id) resetTypeForm()
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Vehicle Masters</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage vehicle types, brands, and models for rider onboarding. Map each rider vehicle type to the exact
          customer app vehicle name received on order webhooks.
        </p>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === item.key ? 'bg-brand-orange text-white' : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading vehicle masters...</p>
      ) : (
        <>
          {tab === 'types' ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Icon</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Customer app vehicle</th>
                      <th className="px-4 py-3">Brands</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t border-slate-100 ${editingTypeId === item.id ? 'bg-orange-50/50' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3">
                          {item.iconKey ? (
                            <span className="inline-flex items-center gap-2 text-brand-orange">
                              <MaterialIcon iconKey={item.iconKey} className="text-xl" />
                              <span className="text-xs text-slate-500">{item.iconKey}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.code}</td>
                        <td className="max-w-[220px] px-4 py-3 text-slate-600">
                          <span className="line-clamp-2">{item.customerAppVehicleType || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item._count?.brands ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconActionButton
                              title="Edit vehicle type"
                              disabled={saving}
                              onClick={() => startEditType(item)}
                              className="hover:border-brand-orange hover:text-brand-orange"
                            >
                              <FiEdit2 className="text-base" />
                            </IconActionButton>
                            <IconActionButton
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                              disabled={saving}
                              onClick={() => toggleActive('types', item)}
                              className={
                                item.isActive
                                  ? 'hover:border-emerald-300 hover:text-emerald-600'
                                  : 'hover:border-slate-400 hover:text-slate-800'
                              }
                            >
                              {item.isActive ? (
                                <FiCheck className="text-base" />
                              ) : (
                                <FiXCircle className="text-base" />
                              )}
                            </IconActionButton>
                            <IconActionButton
                              title="Delete vehicle type"
                              disabled={saving}
                              onClick={() => handleDelete('types', item)}
                              className="hover:border-rose-300 hover:text-rose-600"
                            >
                              <FiTrash2 className="text-base" />
                            </IconActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={handleSubmitType} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {editingTypeId ? 'Edit vehicle type' : 'Add vehicle type'}
                  </h2>
                  {editingTypeId ? (
                    <button
                      type="button"
                      title="Cancel edit"
                      aria-label="Cancel edit"
                      disabled={saving}
                      onClick={resetTypeForm}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <FiX className="text-base" />
                    </button>
                  ) : null}
                </div>
                <input required placeholder="Name (e.g. 3-wheeler)" value={typeForm.name} onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input required placeholder="Code (e.g. three_wheeler)" value={typeForm.code} onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input
                  placeholder="Customer app vehicle (e.g. Motorbike)"
                  value={typeForm.customerAppVehicleType}
                  onChange={(e) => setTypeForm((f) => ({ ...f, customerAppVehicleType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500">
                  Must match the webhook `vehicle_name` exactly (case-insensitive), e.g. Motorbike, 3 Wheeler, Mini
                  Truck(Tata 407), Pickup / LCV.
                </p>
                <input placeholder="Description" value={typeForm.description} onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <IconKeySelect
                  label="Material icon"
                  required
                  value={typeForm.iconKey}
                  onChange={(iconKey) => setTypeForm((f) => ({ ...f, iconKey }))}
                  options={vehicleIconOptions}
                />
                <input type="number" placeholder="Sort order" value={typeForm.sortOrder} onChange={(e) => setTypeForm((f) => ({ ...f, sortOrder: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white">
                  {editingTypeId ? 'Save changes' : 'Add type'}
                </button>
              </form>
            </div>
          ) : null}

          {tab === 'brands' ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Vehicle type</th>
                      <th className="px-4 py-3">Models</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.vehicleType?.name ?? item.vehicleTypeId}</td>
                        <td className="px-4 py-3 text-slate-600">{item._count?.models ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconActionButton
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                              disabled={saving}
                              onClick={() => toggleActive('brands', item)}
                              className={
                                item.isActive
                                  ? 'hover:border-emerald-300 hover:text-emerald-600'
                                  : 'hover:border-slate-400 hover:text-slate-800'
                              }
                            >
                              {item.isActive ? (
                                <FiCheck className="text-base" />
                              ) : (
                                <FiXCircle className="text-base" />
                              )}
                            </IconActionButton>
                            <IconActionButton
                              title="Delete brand"
                              disabled={saving}
                              onClick={() => handleDelete('brands', item)}
                              className="hover:border-rose-300 hover:text-rose-600"
                            >
                              <FiTrash2 className="text-base" />
                            </IconActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={handleCreateBrand} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Add vehicle brand</h2>
                <input required placeholder="Brand name" value={brandForm.name} onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <select required value={brandForm.vehicleTypeId} onChange={(e) => setBrandForm((f) => ({ ...f, vehicleTypeId: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select vehicle type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white">
                  Add brand
                </button>
              </form>
            </div>
          ) : null}

          {tab === 'models' ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Model</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Vehicle type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.brand?.name ?? item.brandId}</td>
                        <td className="px-4 py-3 text-slate-600">{item.brand?.vehicleType?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconActionButton
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                              disabled={saving}
                              onClick={() => toggleActive('models', item)}
                              className={
                                item.isActive
                                  ? 'hover:border-emerald-300 hover:text-emerald-600'
                                  : 'hover:border-slate-400 hover:text-slate-800'
                              }
                            >
                              {item.isActive ? (
                                <FiCheck className="text-base" />
                              ) : (
                                <FiXCircle className="text-base" />
                              )}
                            </IconActionButton>
                            <IconActionButton
                              title="Delete model"
                              disabled={saving}
                              onClick={() => handleDelete('models', item)}
                              className="hover:border-rose-300 hover:text-rose-600"
                            >
                              <FiTrash2 className="text-base" />
                            </IconActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={handleCreateModel} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Add vehicle model</h2>
                <input required placeholder="Model name" value={modelForm.name} onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <select required value={modelForm.brandId} onChange={(e) => setModelForm((f) => ({ ...f, brandId: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.vehicleType?.name})
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white">
                  Add model
                </button>
              </form>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export default VehicleMastersPage
