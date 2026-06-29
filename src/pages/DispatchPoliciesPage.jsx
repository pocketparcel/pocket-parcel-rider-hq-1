import { useCallback, useEffect, useMemo, useState } from 'react'

import { adminApi } from '../config/api'



function Toggle({ checked, disabled, onChange, label }) {

  return (

    <button

      type="button"

      role="switch"

      aria-checked={checked}

      aria-label={label}

      disabled={disabled}

      onClick={() => onChange(!checked)}

      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${

        checked ? 'bg-brand-orange' : 'bg-slate-300'

      } ${disabled ? 'opacity-50' : ''}`}

    >

      <span

        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${

          checked ? 'translate-x-6' : 'translate-x-1'

        }`}

      />

    </button>

  )

}



function DispatchPoliciesPage({ adminToken, onUnauthorized }) {

  const [policies, setPolicies] = useState([])

  const [loading, setLoading] = useState(true)

  const [savingKey, setSavingKey] = useState('')

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')



  const headers = useMemo(

    () => ({ Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }),

    [adminToken],

  )



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

    [headers, onUnauthorized],

  )



  const loadPolicies = useCallback(async () => {

    try {

      setLoading(true)

      setError('')

      const data = await apiFetch(adminApi.dispatchPolicies)

      setPolicies(Array.isArray(data) ? data : [])

    } catch (err) {

      setError(err.message || 'Failed to load dispatch policies')

    } finally {

      setLoading(false)

    }

  }, [apiFetch])



  useEffect(() => {

    loadPolicies()

  }, [loadPolicies])



  async function savePolicy(policy, patch) {

    try {

      setSavingKey(policy.key)

      setError('')

      setSuccess('')

      await apiFetch(adminApi.dispatchPolicies, {

        method: 'PATCH',

        body: JSON.stringify({ key: policy.key, ...patch }),

      })

      setSuccess('Dispatch policy saved.')

      await loadPolicies()

    } catch (err) {

      setError(err.message || 'Failed to save dispatch policy')

    } finally {

      setSavingKey('')

    }

  }



  return (

    <div className="space-y-4">

      <div>

        <h1 className="text-2xl font-bold text-slate-900">Dispatch Policies</h1>

        <p className="mt-1 text-sm text-slate-600">

          Configure rider dispatch rules and incoming order request behaviour.

        </p>

      </div>



      {error ? (

        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">

          {error}

        </div>

      ) : null}

      {success ? (

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

          {success}

        </div>

      ) : null}



      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <table className="min-w-full divide-y divide-slate-200 text-sm">

          <thead className="bg-slate-50">

            <tr>

              <th className="px-4 py-3 text-left font-semibold text-slate-600">Policy</th>

              <th className="px-4 py-3 text-left font-semibold text-slate-600">Settings</th>

              <th className="px-4 py-3 text-left font-semibold text-slate-600">Value</th>

              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100">

            {loading ? (

              <tr>

                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">

                  Loading policies...

                </td>

              </tr>

            ) : policies.length === 0 ? (

              <tr>

                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">

                  No dispatch policies configured yet.

                </td>

              </tr>

            ) : (

              policies.map((policy) => {
                if (policy.type === 'incoming_order_request') {
                  return (
                    <IncomingOrderRequestRow
                      key={policy.key}
                      policy={policy}
                      saving={savingKey === policy.key}
                      onSave={savePolicy}
                    />
                  )
                }

                if (policy.type === 'order_dispatch_radius') {
                  return (
                    <OrderDispatchRadiusRow
                      key={policy.key}
                      policy={policy}
                      saving={savingKey === policy.key}
                      onSave={savePolicy}
                    />
                  )
                }

                if (policy.type === 'order_dispatch_retry') {
                  return (
                    <OrderDispatchRetryRow
                      key={policy.key}
                      policy={policy}
                      saving={savingKey === policy.key}
                      onSave={savePolicy}
                    />
                  )
                }

                if (policy.type === 'order_warehouse_fallback') {
                  return (
                    <OrderWarehouseFallbackRow
                      key={policy.key}
                      policy={policy}
                      saving={savingKey === policy.key}
                      onSave={savePolicy}
                    />
                  )
                }

                if (policy.type === 'order_rider_not_accepted') {
                  return (
                    <OrderRiderNotAcceptedRow
                      key={policy.key}
                      policy={policy}
                      saving={savingKey === policy.key}
                      onSave={savePolicy}
                    />
                  )
                }

                return (
                  <RejectPolicyRow
                    key={policy.key}
                    policy={policy}
                    saving={savingKey === policy.key}
                    onSave={savePolicy}
                  />
                )
              })

            )}

          </tbody>

        </table>

      </div>

    </div>

  )

}



function RejectPolicyRow({ policy, saving, onSave }) {

  const [enabled, setEnabled] = useState(policy.enabled)

  const [limit, setLimit] = useState(policy.consecutiveRejectLimit)

  const [endOfDay, setEndOfDay] = useState(policy.blockUntilEndOfDay)



  useEffect(() => {

    setEnabled(policy.enabled)

    setLimit(policy.consecutiveRejectLimit)

    setEndOfDay(policy.blockUntilEndOfDay)

  }, [policy])



  const dirty =

    enabled !== policy.enabled ||

    Number(limit) !== Number(policy.consecutiveRejectLimit) ||

    endOfDay !== policy.blockUntilEndOfDay



  return (

    <tr>

      <td className="px-4 py-4 align-top">

        <p className="font-semibold text-slate-900">{policy.name}</p>

        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>

      </td>

      <td className="px-4 py-4 align-top">

        <Toggle

          checked={enabled}

          disabled={saving}

          label="Enable consecutive reject policy"

          onChange={setEnabled}

        />

        <p className="mt-1 text-xs text-slate-500">Policy enabled</p>

      </td>

      <td className="px-4 py-4 align-top">

        <div className="space-y-3">

          <div>

            <input

              type="number"

              min={1}

              max={50}

              value={limit}

              disabled={saving || !enabled}

              onChange={(event) => setLimit(event.target.value)}

              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"

            />

            <p className="mt-1 text-xs text-slate-500">Consecutive rejects</p>

          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">

            <input

              type="checkbox"

              checked={endOfDay}

              disabled={saving || !enabled}

              onChange={(event) => setEndOfDay(event.target.checked)}

            />

            Rest of day

          </label>

        </div>

      </td>

      <td className="px-4 py-4 align-top">

        <button

          type="button"

          disabled={saving || !dirty}

          onClick={() =>

            onSave(policy, {

              enabled,

              consecutiveRejectLimit: Number(limit),

              blockUntilEndOfDay: endOfDay,

            })

          }

          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"

        >

          {saving ? 'Saving...' : 'Save'}

        </button>

      </td>

    </tr>

  )

}



function OrderDispatchRadiusRow({ policy, saving, onSave }) {
  const [enabled, setEnabled] = useState(policy.enabled)
  const [radiusKm, setRadiusKm] = useState(policy.radiusKm)

  useEffect(() => {
    setEnabled(policy.enabled)
    setRadiusKm(policy.radiusKm)
  }, [policy])

  const dirty =
    enabled !== policy.enabled || Number(radiusKm) !== Number(policy.radiusKm)

  return (
    <tr>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-900">{policy.name}</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <Toggle
          checked={enabled}
          disabled={saving}
          label="Enable order dispatch radius"
          onChange={setEnabled}
        />
        <p className="mt-1 text-xs text-slate-500">Radius filter enabled</p>
      </td>
      <td className="px-4 py-4 align-top">
        <input
          type="number"
          min={0.1}
          max={500}
          step={0.1}
          value={radiusKm}
          disabled={saving || !enabled}
          onChange={(event) => setRadiusKm(event.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">Kilometers from pickup location</p>
      </td>
      <td className="px-4 py-4 align-top">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() =>
            onSave(policy, {
              enabled,
              radiusKm: Number(radiusKm),
            })
          }
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

function OrderRiderNotAcceptedRow({ policy, saving, onSave }) {
  const [enabled, setEnabled] = useState(policy.enabled)
  const [minutes, setMinutes] = useState(policy.notifyAfterMinutes)
  const [defaultReason, setDefaultReason] = useState(policy.defaultReason)

  useEffect(() => {
    setEnabled(policy.enabled)
    setMinutes(policy.notifyAfterMinutes)
    setDefaultReason(policy.defaultReason)
  }, [policy])

  const dirty =
    enabled !== policy.enabled ||
    Number(minutes) !== Number(policy.notifyAfterMinutes) ||
    defaultReason !== policy.defaultReason

  return (
    <tr>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-900">{policy.name}</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <Toggle
          checked={enabled}
          disabled={saving}
          label="Enable local order rider not accepted notification"
          onChange={setEnabled}
        />
        <p className="mt-1 text-xs text-slate-500">Notification enabled</p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-3">
          <div>
            <input
              type="number"
              min={1}
              value={minutes}
              disabled={saving || !enabled}
              onChange={(event) => setMinutes(event.target.value)}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">Minutes without rider acceptance</p>
          </div>
          <div>
            <input
              type="text"
              value={defaultReason}
              disabled={saving || !enabled}
              onChange={(event) => setDefaultReason(event.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">Default reason sent to customer API</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() =>
            onSave(policy, {
              enabled,
              notifyAfterMinutes: Number(minutes),
              defaultReason,
            })
          }
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

function OrderWarehouseFallbackRow({ policy, saving, onSave }) {
  const [enabled, setEnabled] = useState(policy.enabled)
  const [seconds, setSeconds] = useState(policy.fallbackSeconds)

  useEffect(() => {
    setEnabled(policy.enabled)
    setSeconds(policy.fallbackSeconds)
  }, [policy])

  const dirty =
    enabled !== policy.enabled || Number(seconds) !== Number(policy.fallbackSeconds)

  return (
    <tr>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-900">{policy.name}</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <Toggle
          checked={enabled}
          disabled={saving}
          label="Enable warehouse fallback for non-local orders"
          onChange={setEnabled}
        />
        <p className="mt-1 text-xs text-slate-500">Fallback enabled</p>
      </td>
      <td className="px-4 py-4 align-top">
        <input
          type="number"
          min={1}
          value={seconds}
          disabled={saving || !enabled}
          onChange={(event) => setSeconds(event.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">Seconds before warehouse assignment</p>
      </td>
      <td className="px-4 py-4 align-top">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() =>
            onSave(policy, {
              enabled,
              fallbackSeconds: Number(seconds),
            })
          }
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

function OrderDispatchRetryRow({ policy, saving, onSave }) {
  const [enabled, setEnabled] = useState(policy.enabled)
  const [seconds, setSeconds] = useState(policy.retrySeconds)

  useEffect(() => {
    setEnabled(policy.enabled)
    setSeconds(policy.retrySeconds)
  }, [policy])

  const dirty =
    enabled !== policy.enabled || Number(seconds) !== Number(policy.retrySeconds)

  return (
    <tr>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-900">{policy.name}</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <Toggle
          checked={enabled}
          disabled={saving}
          label="Enable unassigned order dispatch retry"
          onChange={setEnabled}
        />
        <p className="mt-1 text-xs text-slate-500">Retry enabled</p>
      </td>
      <td className="px-4 py-4 align-top">
        <input
          type="number"
          min={1}
          value={seconds}
          disabled={saving || !enabled}
          onChange={(event) => setSeconds(event.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">Seconds between retries</p>
      </td>
      <td className="px-4 py-4 align-top">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() =>
            onSave(policy, {
              enabled,
              retrySeconds: Number(seconds),
            })
          }
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

function IncomingOrderRequestRow({ policy, saving, onSave }) {

  const [seconds, setSeconds] = useState(policy.requestTimeoutSeconds)



  useEffect(() => {

    setSeconds(policy.requestTimeoutSeconds)

  }, [policy])



  const dirty = Number(seconds) !== Number(policy.requestTimeoutSeconds)



  return (

    <tr>

      <td className="px-4 py-4 align-top">

        <p className="font-semibold text-slate-900">{policy.name}</p>

        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{policy.description}</p>

      </td>

      <td className="px-4 py-4 align-top text-sm text-slate-600">Request countdown</td>

      <td className="px-4 py-4 align-top">

        <input

          type="number"

          min={15}

          max={180}

          value={seconds}

          disabled={saving}

          onChange={(event) => setSeconds(event.target.value)}

          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"

        />

        <p className="mt-1 text-xs text-slate-500">Seconds (15–180)</p>

      </td>

      <td className="px-4 py-4 align-top">

        <button

          type="button"

          disabled={saving || !dirty}

          onClick={() =>

            onSave(policy, {

              requestTimeoutSeconds: Number(seconds),

            })

          }

          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"

        >

          {saving ? 'Saving...' : 'Save'}

        </button>

      </td>

    </tr>

  )

}



export default DispatchPoliciesPage

