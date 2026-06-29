import { useState } from 'react'
import { adminApi } from '../config/api'

function AdminLoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@pocketparcel.com')
  const [password, setPassword] = useState('Admin@123')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(adminApi.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.data?.token) {
        throw new Error(payload?.message || `Login failed (${response.status})`)
      }
      onLogin(payload.data)
    } catch (err) {
      setError(err.message || 'Unable to login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to access rider operations dashboard.</p>
        <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
        <button type="submit" disabled={submitting} className="mt-5 w-full rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage
