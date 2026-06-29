import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../config/api'

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

function ProfilePage({ adminToken, onUnauthorized, onProfileUpdated }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })

  const headers = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  }

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

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(adminApi.profile)
      if (!data) return
      setProfile(data)
      setProfileForm({ name: data.name ?? '', email: data.email ?? '' })
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken) loadProfile()
  }, [adminToken, loadProfile])

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiFetch(adminApi.updateProfile, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      })
      if (!data) return
      setProfile(data)
      onProfileUpdated?.(data)
      setSuccess('Profile updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your account name and email address.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading profile...</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Account details</h2>
          <p className="mt-1 text-xs text-slate-500">
            Role: {roleLabel} · Last updated: {formatDate(profile?.updatedAt)}
          </p>

          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Full name</span>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Email address</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              <Link
                to="/change-password"
                className="text-sm font-medium text-brand-orange hover:underline"
              >
                Change password
              </Link>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default ProfilePage
