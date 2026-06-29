import { useCallback, useEffect, useState } from 'react'
import {
  FiCheck,
  FiEdit2,
  FiStar,
  FiTrash2,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import { MaterialIcon } from '../components/icons/materialIconCatalog'
import CountryIconDropdown from '../components/icons/CountryIconDropdown'
import { adminApi } from '../config/api'
import { resolveFlagEmoji } from '../utils/countryFlagEmoji'

const emptyForm = {
  name: '',
  code: '',
  dialCode: '+91',
  displayType: 'icon',
  iconKey: 'public',
  flagEmoji: '',
  maxNationalDigits: 10,
  sortOrder: 0,
  isDefault: false,
}

function CountryDisplayPreview({ item }) {
  const flag = resolveFlagEmoji(item.flagEmoji, item.code)

  if (item.displayType === 'emoji' && flag) {
    return <span className="text-2xl leading-none">{flag}</span>
  }
  if (item.iconKey) {
    return (
      <span className="inline-flex items-center gap-2 text-brand-orange">
        <MaterialIcon iconKey={item.iconKey} className="text-xl" />
        <span className="text-xs text-slate-500">{item.iconKey}</span>
      </span>
    )
  }
  if (flag) {
    return <span className="text-2xl leading-none">{flag}</span>
  }
  return <span>—</span>
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

function CountriesPage({ adminToken, onUnauthorized }) {
  const [countries, setCountries] = useState([])
  const [countryIcons, setCountryIcons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

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

  const loadCountries = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [countriesData, catalogData] = await Promise.all([
        apiFetch(adminApi.countries),
        apiFetch(`${adminApi.iconCatalog}?group=country`),
      ])
      setCountries(Array.isArray(countriesData) ? countriesData : [])
      setCountryIcons(Array.isArray(catalogData) ? catalogData : [])
    } catch (err) {
      setError(err.message || 'Failed to load countries')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken) loadCountries()
  }, [adminToken, loadCountries])

  function buildCountryPayload(formState) {
    const displayType = formState.displayType
    return {
      name: formState.name,
      code: formState.code,
      dialCode: formState.dialCode,
      displayType,
      iconKey: displayType === 'icon' ? formState.iconKey : undefined,
      flagEmoji:
        displayType === 'emoji'
          ? resolveFlagEmoji(formState.flagEmoji, formState.code)
          : undefined,
      maxNationalDigits: Number(formState.maxNationalDigits) || 10,
      sortOrder: Number(formState.sortOrder) || 0,
      isDefault: formState.isDefault,
    }
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setError('')
    setForm({
      name: item.name ?? '',
      code: item.code ?? '',
      dialCode: item.dialCode ?? '',
      displayType: item.displayType === 'emoji' ? 'emoji' : 'icon',
      iconKey: item.iconKey ?? 'public',
      flagEmoji: item.flagEmoji ?? '',
      maxNationalDigits: item.maxNationalDigits ?? 10,
      sortOrder: item.sortOrder ?? 0,
      isDefault: item.isDefault ?? false,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.displayType === 'icon' && !form.iconKey) {
      setError('Please select a country icon')
      return
    }
    if (form.displayType === 'emoji' && !form.flagEmoji.trim()) {
      setError('Please enter a flag emoji or country code')
      return
    }

    setSaving(true)
    try {
      const payload = buildCountryPayload(form)
      if (editingId) {
        await apiFetch(`${adminApi.countries}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(adminApi.countries, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      resetForm()
      await loadCountries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item) {
    setSaving(true)
    try {
      await apiFetch(`${adminApi.countries}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      await loadCountries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function setDefault(item) {
    setSaving(true)
    try {
      await apiFetch(`${adminApi.countries}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
      })
      await loadCountries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    setSaving(true)
    try {
      await apiFetch(`${adminApi.countries}/${item.id}`, { method: 'DELETE' })
      if (editingId === item.id) resetForm()
      await loadCountries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Country Masters</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose a Material icon or flag emoji — the rider app login screen shows exactly what you pick.
        </p>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading countries...</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Display</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Dial</th>
                  <th className="px-4 py-3">Digits</th>
                  <th className="px-4 py-3">Default</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 ${editingId === item.id ? 'bg-orange-50/50' : ''}`}
                  >
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">
                      <CountryDisplayPreview item={item} />
                    </td>
                    <td className="px-4 py-3">{item.code}</td>
                    <td className="px-4 py-3">{item.dialCode}</td>
                    <td className="px-4 py-3">{item.maxNationalDigits}</td>
                    <td className="px-4 py-3">{item.isDefault ? 'Yes' : '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconActionButton
                          title="Edit country"
                          disabled={saving}
                          onClick={() => startEdit(item)}
                          className="hover:border-brand-orange hover:text-brand-orange"
                        >
                          <FiEdit2 className="text-base" />
                        </IconActionButton>
                        {!item.isDefault ? (
                          <IconActionButton
                            title="Set as default"
                            disabled={saving}
                            onClick={() => setDefault(item)}
                            className="hover:border-amber-300 hover:text-amber-600"
                          >
                            <FiStar className="text-base" />
                          </IconActionButton>
                        ) : null}
                        <IconActionButton
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                          disabled={saving}
                          onClick={() => toggleActive(item)}
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
                          title="Delete country"
                          disabled={saving}
                          onClick={() => handleDelete(item)}
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

          <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {editingId ? 'Edit country' : 'Add country'}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <FiX className="text-sm" />
                  Cancel
                </button>
              ) : null}
            </div>

            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              required
              readOnly={Boolean(editingId)}
              placeholder="Code (IN)"
              value={form.code}
              onChange={(e) => {
                const code = e.target.value.toUpperCase()
                setForm((f) => ({
                  ...f,
                  code,
                  flagEmoji:
                    f.displayType === 'emoji' && /^[A-Z]{2}$/.test(code)
                      ? resolveFlagEmoji(code, code)
                      : f.flagEmoji,
                }))
              }}
              className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${
                editingId ? 'bg-slate-50 text-slate-600' : ''
              }`}
            />
            <input
              required
              placeholder="Dial code (+91)"
              value={form.dialCode}
              onChange={(e) => setForm((f) => ({ ...f, dialCode: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Show in rider app as</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, displayType: 'icon' }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.displayType === 'icon'
                      ? 'border-brand-orange bg-orange-50 text-brand-orange'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  Material icon
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, displayType: 'emoji' }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.displayType === 'emoji'
                      ? 'border-brand-orange bg-orange-50 text-brand-orange'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  Flag emoji
                </button>
              </div>
            </div>

            {form.displayType === 'icon' ? (
              <CountryIconDropdown
                label="Country icon"
                required
                value={form.iconKey}
                onChange={(iconKey) => setForm((f) => ({ ...f, iconKey }))}
                options={countryIcons}
                placeholder={`Select from ${countryIcons.length} icons`}
              />
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Flag emoji *</label>
                <input
                  required
                  placeholder="RU or 🇷🇺"
                  value={form.flagEmoji}
                  onChange={(e) => setForm((f) => ({ ...f, flagEmoji: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500">
                  Enter a 2-letter country code (e.g. RU, IN) or paste a flag emoji.
                </p>
                {form.flagEmoji ? (
                  <p className="text-xs text-slate-500">
                    Preview:{' '}
                    <span className="text-2xl leading-none">{resolveFlagEmoji(form.flagEmoji, form.code)}</span>
                  </p>
                ) : null}
              </div>
            )}

            <input
              type="number"
              placeholder="Max digits"
              value={form.maxNationalDigits}
              onChange={(e) => setForm((f) => ({ ...f, maxNationalDigits: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Sort order"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Default country
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add country'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

export default CountriesPage
