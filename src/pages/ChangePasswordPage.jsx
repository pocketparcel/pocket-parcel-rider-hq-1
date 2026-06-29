import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../config/api'

function ChangePasswordPage({ adminToken, onUnauthorized }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

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

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    setSaving(true)
    try {
      await apiFetch(adminApi.changePassword, {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Password changed successfully')
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Change Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update your login password. You will need your current password to continue.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Current password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">New password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Confirm new password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Change password'}
            </button>
            <Link to="/profile" className="text-sm font-medium text-slate-600 hover:text-brand-orange">
              Back to profile
            </Link>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ChangePasswordPage
