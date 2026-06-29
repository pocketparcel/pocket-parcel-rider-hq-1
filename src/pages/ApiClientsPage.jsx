import { useCallback, useEffect, useState } from 'react'
import { FiCopy, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { adminApi } from '../config/api'

function ApiClientsPage({ adminToken, onUnauthorized }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [revealedSecret, setRevealedSecret] = useState(null)

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

  const loadClients = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(adminApi.apiClients)
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load API clients')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken) loadClients()
  }, [adminToken, loadClients])

  async function handleCreate(event) {
    event.preventDefault()
    const name = newClientName.trim()
    if (!name) return

    setCreating(true)
    setError('')
    setSuccess('')
    setRevealedSecret(null)

    try {
      const data = await apiFetch(adminApi.apiClients, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (!data) return

      setRevealedSecret({
        clientId: data.client.clientId,
        clientSecret: data.clientSecret,
        name: data.client.name,
      })
      setNewClientName('')
      setSuccess('API client created. Copy the secret now — it will not be shown again.')
      await loadClients()
    } catch (err) {
      setError(err.message || 'Failed to create API client')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(client, isActive) {
    setError('')
    setSuccess('')
    try {
      await apiFetch(adminApi.apiClientStatus(client.id), {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      })
      setSuccess(`Client ${isActive ? 'enabled' : 'disabled'}`)
      await loadClients()
    } catch (err) {
      setError(err.message || 'Failed to update client')
    }
  }

  async function rotateSecret(client) {
    setError('')
    setSuccess('')
    setRevealedSecret(null)
    try {
      const data = await apiFetch(adminApi.rotateApiClientSecret(client.id), { method: 'POST' })
      if (!data) return
      setRevealedSecret({
        clientId: data.client.clientId,
        clientSecret: data.clientSecret,
        name: data.client.name,
      })
      setSuccess('Secret rotated. Copy the new secret now — it will not be shown again.')
      await loadClients()
    } catch (err) {
      setError(err.message || 'Failed to rotate secret')
    }
  }

  async function deleteClient(client) {
    if (
      !window.confirm(
        `Delete "${client.name}" (${client.clientId})? This cannot be undone and the integration will stop working immediately.`,
      )
    ) {
      return
    }

    setError('')
    setSuccess('')
    setRevealedSecret(null)

    try {
      await apiFetch(adminApi.apiClientById(client.id), { method: 'DELETE' })
      setSuccess(`Client "${client.name}" deleted`)
      await loadClients()
    } catch (err) {
      setError(err.message || 'Failed to delete client')
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess('Copied to clipboard')
    } catch {
      setError('Unable to copy to clipboard')
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">API Clients</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Issue Client ID and Client Secret pairs for external platforms. They can call protected API
          routes using the headers <code className="rounded bg-slate-100 px-1">X-Client-Id</code> and{' '}
          <code className="rounded bg-slate-100 px-1">X-Client-Secret</code>. Admin UI continues to use JWT
          Bearer tokens after login.
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

      {revealedSecret ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">One-time credentials for {revealedSecret.name}</p>
          <p className="mt-1 text-xs text-amber-800">
            Share these securely with the external platform. The secret cannot be retrieved later.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <CredentialField label="Client ID" value={revealedSecret.clientId} onCopy={copyText} />
            <CredentialField label="Client Secret" value={revealedSecret.clientSecret} onCopy={copyText} />
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Create client</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="Platform name e.g. Pocket Parcel Core"
            className="min-w-[260px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FiPlus />
            {creating ? 'Creating...' : 'Create client'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Active integrations</h2>
        {loading ? <p className="text-sm text-slate-500">Loading clients...</p> : null}
        {!loading && clients.length === 0 ? (
          <p className="text-sm text-slate-500">No API clients yet.</p>
        ) : null}
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{client.name}</p>
                <p className="text-xs text-slate-500">
                  Client ID: <span className="font-mono">{client.clientId}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Last used: {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(client, !client.isActive)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    client.isActive
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {client.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => rotateSecret(client)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FiRefreshCw />
                  Rotate secret
                </button>
                <button
                  type="button"
                  onClick={() => deleteClient(client)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  <FiTrash2 />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">How external APIs authenticate</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-800">{`POST /api/v1/webhooks/orders
X-Client-Id: pp-dev-integration
X-Client-Secret: dev-client-secret
Content-Type: application/json

POST /api/v1/webhooks/orders/rebroadcast
X-Client-Id: pp-dev-integration
X-Client-Secret: dev-client-secret
Content-Type: application/json

{ "id": "customer-order-id" }`}</pre>
        <p className="mt-2 text-xs text-slate-500">
          Dev seed client: <span className="font-mono">pp-dev-integration</span> /{' '}
          <span className="font-mono">dev-client-secret</span>
        </p>
      </div>
    </section>
  )
}

function CredentialField({ label, value, onCopy }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 break-all text-xs text-slate-800">{value}</code>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          aria-label={`Copy ${label}`}
        >
          <FiCopy />
        </button>
      </div>
    </div>
  )
}

export default ApiClientsPage
