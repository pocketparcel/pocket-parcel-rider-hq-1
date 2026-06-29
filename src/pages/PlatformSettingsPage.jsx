import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiEye, FiEyeOff, FiMessageSquare, FiSave, FiSend } from 'react-icons/fi'
import { adminApi } from '../config/api'
import {
  decryptSecret,
  encryptSecret,
  shortenEncryptedPayload,
} from '../utils/secretsCrypto'

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

function NumberField({ label, value, onChange, min, max, disabled }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50"
      />
    </label>
  )
}

function TextField({ label, value, onChange, placeholder, disabled, hint, type = 'text' }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50"
      />
      {hint ? <span className="mt-1 block text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  )
}

function SecretField({
  label,
  value,
  encryptedValue,
  maskedValue,
  configured,
  disabled,
  onChange,
  onClear,
}) {
  const [revealed, setRevealed] = useState(false)
  const [revealBusy, setRevealBusy] = useState(false)
  const [revealError, setRevealError] = useState('')

  async function handleReveal() {
    if (revealed) {
      setRevealed(false)
      return
    }
    if (!encryptedValue) return

    try {
      setRevealBusy(true)
      setRevealError('')
      const plaintext = await decryptSecret(encryptedValue)
      onChange(plaintext)
      setRevealed(true)
    } catch {
      setRevealError('Could not decrypt stored API key. Check VITE_SECRETS_ENCRYPTION_KEY.')
    } finally {
      setRevealBusy(false)
    }
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex gap-2">
        <input
          type={revealed ? 'text' : 'password'}
          disabled={disabled}
          value={value}
          placeholder={configured ? 'Enter a new API key to replace the stored value' : 'API key'}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50"
        />
        {configured ? (
          <button
            type="button"
            disabled={disabled || revealBusy || !encryptedValue}
            onClick={handleReveal}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title={revealed ? 'Hide API key' : 'Reveal decrypted API key'}
          >
            {revealed ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        ) : null}
      </div>
      {configured ? (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] text-slate-500">
            Stored encrypted {maskedValue ? `(${maskedValue})` : ''}
          </p>
          {encryptedValue ? (
            <p className="break-all font-mono text-[10px] text-slate-400">
              {shortenEncryptedPayload(encryptedValue)}
            </p>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
          >
            Clear stored API key
          </button>
        </div>
      ) : null}
      {revealError ? <span className="mt-1 block text-[11px] text-rose-600">{revealError}</span> : null}
      <span className="mt-1 block text-[11px] text-slate-500">
        API keys are encrypted before save and only the encrypted payload travels over the network.
      </span>
    </label>
  )
}

function SettingsCard({ title, description, children, onSave, saving, dirty }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
      <div className="flex justify-end border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <FiSave size={14} className={saving ? 'animate-pulse' : ''} />
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>
    </section>
  )
}

function ScopeToggles({ localEnabled, nonLocalEnabled, onLocalChange, onNonLocalChange, disabled }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-800">Local orders</p>
          <p className="text-[11px] text-slate-500">Same-city deliveries</p>
        </div>
        <Toggle
          checked={localEnabled}
          disabled={disabled}
          onChange={onLocalChange}
          label="Local orders OTP"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-800">Non-local orders</p>
          <p className="text-[11px] text-slate-500">Domestic / international</p>
        </div>
        <Toggle
          checked={nonLocalEnabled}
          disabled={disabled}
          onChange={onNonLocalChange}
          label="Non-local orders OTP"
        />
      </div>
    </div>
  )
}

function TestSmsPanel({ label, otpType, scoped = false, disabled, onTest }) {
  const [phone, setPhone] = useState('')
  const [isLocal, setIsLocal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [testError, setTestError] = useState('')

  async function handleTest() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setTestError('Enter a valid 10-digit mobile number')
      return
    }

    try {
      setBusy(true)
      setTestError('')
      setResult(null)
      const payload = await onTest({
        phone: digits,
        otpType,
        isLocal: scoped ? isLocal : undefined,
      })
      setResult(payload)
    } catch (err) {
      setTestError(err.message || 'Test SMS failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-[11px] text-slate-500">
        Uses saved settings for this section. Save changes before testing new values.
      </p>

      {scoped ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setIsLocal(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              isLocal
                ? 'bg-brand-orange text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            Local
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setIsLocal(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              !isLocal
                ? 'bg-brand-orange text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            Non-local
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          disabled={disabled || busy}
          value={phone}
          placeholder="10-digit mobile number"
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={handleTest}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <FiSend size={14} className={busy ? 'animate-pulse' : ''} />
          {busy ? 'Sending…' : 'Test SMS'}
        </button>
      </div>

      {testError ? <p className="mt-2 text-xs text-rose-600">{testError}</p> : null}
      {result ? (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p>{result.message || (result.smsSent ? 'Test SMS sent' : 'Test OTP generated')}</p>
          {result.devOtp ? <p className="mt-1 font-mono">Dev OTP: {result.devOtp}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function OtpTypeFields({
  config,
  onChange,
  disabled,
  showScopes = false,
  loginTemplate = false,
  scopedTemplates = false,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-800">Enabled</p>
          <p className="text-[11px] text-slate-500">Master switch for this OTP type</p>
        </div>
        <Toggle
          checked={config.enabled}
          disabled={disabled}
          onChange={(enabled) => onChange({ ...config, enabled })}
          label="OTP enabled"
        />
      </div>

      {loginTemplate ? (
        <TextField
          label="DLT message ID (message)"
          value={config.templateId ?? ''}
          disabled={disabled || !config.enabled}
          placeholder="214857"
          hint="Fast2SMS bulkV2 DLT template ID for this flow."
          onChange={(templateId) => onChange({ ...config, templateId })}
        />
      ) : null}

      {showScopes ? (
        <ScopeToggles
          localEnabled={config.local?.enabled !== false}
          nonLocalEnabled={config.nonLocal?.enabled !== false}
          disabled={disabled || !config.enabled}
          onLocalChange={(enabled) =>
            onChange({ ...config, local: { ...config.local, enabled } })
          }
          onNonLocalChange={(enabled) =>
            onChange({ ...config, nonLocal: { ...config.nonLocal, enabled } })
          }
        />
      ) : null}

      {scopedTemplates ? (
        <div className="space-y-3">
          <TextField
            label="DLT message ID — local (message)"
            value={config.local?.templateId ?? ''}
            disabled={disabled || !config.enabled || config.local?.enabled === false}
            placeholder="214857"
            onChange={(templateId) =>
              onChange({ ...config, local: { ...config.local, templateId } })
            }
          />
          <TextField
            label="DLT message ID — non-local (message)"
            value={config.nonLocal?.templateId ?? ''}
            disabled={disabled || !config.enabled || config.nonLocal?.enabled === false}
            placeholder="214857"
            onChange={(templateId) =>
              onChange({ ...config, nonLocal: { ...config.nonLocal, templateId } })
            }
          />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="OTP length"
          min={4}
          max={8}
          disabled={disabled || !config.enabled}
          value={config.length}
          onChange={(length) => onChange({ ...config, length })}
        />
        <NumberField
          label="Expires in (seconds)"
          min={30}
          max={600}
          disabled={disabled || !config.enabled}
          value={config.expiresInSec}
          onChange={(expiresInSec) => onChange({ ...config, expiresInSec })}
        />
      </div>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function createDraftFromSettings(data) {
  return {
    sms: {
      enabled: data.sms?.enabled ?? false,
      apiUrl: data.sms?.apiUrl ?? 'https://www.fast2sms.com/dev/bulkV2',
      route: data.sms?.route ?? 'dlt',
      senderId: data.sms?.senderId ?? '',
      flash: data.sms?.flash ?? '0',
      apiKeyEncrypted: data.sms?.apiKey?.encrypted ?? '',
      apiKeyMasked: data.sms?.apiKey?.masked ?? '',
      apiKeyConfigured: data.sms?.apiKey?.configured ?? false,
      apiKeyDraft: '',
      clearApiKey: false,
    },
    loginOtp: { ...data.loginOtp },
    pickupOtp: {
      ...data.pickupOtp,
      local: { ...data.pickupOtp.local },
      nonLocal: { ...data.pickupOtp.nonLocal },
    },
    deliveryOtp: {
      ...data.deliveryOtp,
      local: { ...data.deliveryOtp.local },
      nonLocal: { ...data.deliveryOtp.nonLocal },
    },
  }
}

function isSmsDirty(draftSms, settingsSms) {
  return (
    draftSms.enabled !== settingsSms?.enabled ||
    draftSms.apiUrl !== (settingsSms?.apiUrl ?? 'https://www.fast2sms.com/dev/bulkV2') ||
    draftSms.senderId !== (settingsSms?.senderId ?? '') ||
    draftSms.flash !== (settingsSms?.flash ?? '0') ||
    Boolean(draftSms.apiKeyDraft) ||
    draftSms.clearApiKey
  )
}

async function buildSmsPatch(draftSms) {
  const patch = {
    enabled: draftSms.enabled,
    apiUrl: draftSms.apiUrl,
    senderId: draftSms.senderId,
    flash: draftSms.flash,
  }

  if (draftSms.clearApiKey) {
    patch.clearApiKey = true
  } else if (draftSms.apiKeyDraft?.trim()) {
    try {
      patch.apiKeyEnc = await encryptSecret(draftSms.apiKeyDraft.trim())
    } catch {
      // HTTPS in transit; server encrypts at rest with SECRETS_ENCRYPTION_KEY.
      patch.apiKey = draftSms.apiKeyDraft.trim()
    }
  }

  return patch
}

export default function PlatformSettingsPage({ adminToken, onUnauthorized }) {
  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const onUnauthorizedRef = useRef(onUnauthorized)
  onUnauthorizedRef.current = onUnauthorized

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }),
    [adminToken],
  )

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return null
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`)
      }
      return payload.data
    },
    [headers],
  )

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(adminApi.platformOtpSmsSettings)
      setSettings(data)
      setDraft(createDraftFromSettings(data))
    } catch (err) {
      setError(err.message || 'Failed to load platform settings')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken) loadSettings()
  }, [adminToken, loadSettings])

  async function saveSection(sectionKey, patch) {
    try {
      setSavingSection(sectionKey)
      setError('')
      setSuccess('')
      const data = await apiFetch(adminApi.platformOtpSmsSettings, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      if (!data) return
      setSettings(data)
      setDraft(createDraftFromSettings(data))
      setSuccess('Platform settings saved.')
    } catch (err) {
      setError(err.message || 'Failed to save platform settings')
    } finally {
      setSavingSection('')
    }
  }

  async function saveSmsSection() {
    try {
      setSavingSection('sms')
      setError('')
      setSuccess('')
      const patch = await buildSmsPatch(draft.sms)
      const data = await apiFetch(adminApi.platformOtpSmsSettings, {
        method: 'PATCH',
        body: JSON.stringify({ sms: patch }),
      })
      if (!data) return
      setSettings(data)
      setDraft(createDraftFromSettings(data))
      setSuccess('Platform settings saved.')
    } catch (err) {
      setError(err.message || 'Failed to save platform settings')
    } finally {
      setSavingSection('')
    }
  }

  async function sendTestSms({ phone, otpType, isLocal }) {
    const body = { phone, otpType }
    if (isLocal != null) body.isLocal = isLocal
    return apiFetch(adminApi.platformOtpSmsTest, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  if (loading || !draft || !settings) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading platform settings…
      </section>
    )
  }

  const smsDirty = isSmsDirty(draft.sms, settings.sms)
  const loginDirty = JSON.stringify(draft.loginOtp) !== JSON.stringify(settings.loginOtp)
  const pickupDirty = JSON.stringify(draft.pickupOtp) !== JSON.stringify(settings.pickupOtp)
  const deliveryDirty = JSON.stringify(draft.deliveryOtp) !== JSON.stringify(settings.deliveryOtp)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FiMessageSquare className="text-brand-orange" />
          <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Fast2SMS bulkV2 DLT settings for login, pickup, and delivery OTP SMS.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Last updated: {formatDateTime(settings.updatedAt)} · API keys are encrypted at rest and in transit.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs text-slate-500">Platform SMS</p>
          <p className="font-semibold text-slate-900">{settings.sms?.enabled ? 'Enabled' : 'Disabled'}</p>
        </div>
        {settings.env?.smsDevMode ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="text-xs text-amber-700">Dev mode</p>
            <p className="font-semibold text-amber-900">
              Env SMS {settings.env?.envSmsEnabled ? 'enabled' : 'disabled'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <p className="text-xs text-slate-500">SMS delivery ready</p>
            <p className="font-semibold text-slate-900">
              {settings.effective?.smsDeliveryEnabled ? 'Yes' : 'No'}
            </p>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs text-slate-500">API key configured</p>
          <p className="font-semibold text-slate-900">{settings.env?.apiKeyConfigured ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <SettingsCard
        title="Fast2SMS (bulkV2 DLT)"
        description="POST https://www.fast2sms.com/dev/bulkV2 — authorization header plus route, sender_id, message, variables_values, numbers, and flash."
        dirty={smsDirty}
        saving={savingSection === 'sms'}
        onSave={saveSmsSection}
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
          <p className="font-medium text-slate-700">Automatic per send</p>
          <p className="mt-1">
            <span className="font-mono">variables_values</span> = generated OTP ·{' '}
            <span className="font-mono">numbers</span> = 91 + mobile ·{' '}
            <span className="font-mono">authorization</span> = API key below
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-800">Platform SMS enabled</p>
            <p className="text-[11px] text-slate-500">Master switch for Fast2SMS delivery.</p>
          </div>
          <Toggle
            checked={draft.sms.enabled}
            onChange={(enabled) => setDraft((current) => ({ ...current, sms: { ...current.sms, enabled } }))}
            label="Platform SMS enabled"
          />
        </div>

        <TextField
          label="API URL"
          value={draft.sms.apiUrl}
          disabled={!draft.sms.enabled}
          placeholder="https://www.fast2sms.com/dev/bulkV2"
          hint="Fast2SMS bulkV2 endpoint."
          onChange={(apiUrl) => setDraft((current) => ({ ...current, sms: { ...current.sms, apiUrl } }))}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Route"
            value={draft.sms.route}
            disabled
            hint="Fixed to dlt for DLT-compliant OTP SMS."
          />
          <TextField
            label="Sender ID (sender_id)"
            value={draft.sms.senderId}
            disabled={!draft.sms.enabled}
            placeholder="PPARCL"
            hint="Approved DLT header."
            onChange={(senderId) => setDraft((current) => ({ ...current, sms: { ...current.sms, senderId } }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-800">Flash SMS (flash)</p>
            <p className="text-[11px] text-slate-500">0 = normal · 1 = flash message</p>
          </div>
          <Toggle
            checked={draft.sms.flash === '1'}
            disabled={!draft.sms.enabled}
            onChange={(enabled) =>
              setDraft((current) => ({
                ...current,
                sms: { ...current.sms, flash: enabled ? '1' : '0' },
              }))
            }
            label="Flash SMS"
          />
        </div>

        <SecretField
          label="API key (authorization)"
          value={draft.sms.apiKeyDraft}
          encryptedValue={draft.sms.apiKeyEncrypted}
          maskedValue={draft.sms.apiKeyMasked}
          configured={draft.sms.apiKeyConfigured && !draft.sms.clearApiKey}
          disabled={!draft.sms.enabled}
          onChange={(apiKeyDraft) =>
            setDraft((current) => ({
              ...current,
              sms: { ...current.sms, apiKeyDraft, clearApiKey: false },
            }))
          }
          onClear={() =>
            setDraft((current) => ({
              ...current,
              sms: {
                ...current.sms,
                apiKeyDraft: '',
                clearApiKey: true,
                apiKeyConfigured: false,
                apiKeyEncrypted: '',
                apiKeyMasked: '',
              },
            }))
          }
        />
      </SettingsCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <SettingsCard
          title="Login OTP"
          description="DLT message ID (message) and OTP rules for rider app login."
          dirty={loginDirty}
          saving={savingSection === 'login'}
          onSave={() => saveSection('login', { loginOtp: draft.loginOtp })}
        >
          <OtpTypeFields
            config={draft.loginOtp}
            loginTemplate
            onChange={(loginOtp) => setDraft((current) => ({ ...current, loginOtp }))}
          />
          <TestSmsPanel
            label="Test login OTP SMS"
            otpType="login"
            disabled={!draft.loginOtp.enabled || !settings.sms?.enabled}
            onTest={sendTestSms}
          />
        </SettingsCard>

        <SettingsCard
          title="Pickup OTP"
          description="Customer pickup verification — DLT message ID per local / non-local scope."
          dirty={pickupDirty}
          saving={savingSection === 'pickup'}
          onSave={() => saveSection('pickup', { pickupOtp: draft.pickupOtp })}
        >
          <OtpTypeFields
            config={draft.pickupOtp}
            showScopes
            scopedTemplates
            onChange={(pickupOtp) => setDraft((current) => ({ ...current, pickupOtp }))}
          />
          <TestSmsPanel
            label="Test pickup OTP SMS"
            otpType="pickup"
            scoped
            disabled={!draft.pickupOtp.enabled || !settings.sms?.enabled}
            onTest={sendTestSms}
          />
        </SettingsCard>

        <SettingsCard
          title="Delivery OTP"
          description="Customer delivery verification — DLT message ID per local / non-local scope."
          dirty={deliveryDirty}
          saving={savingSection === 'delivery'}
          onSave={() => saveSection('delivery', { deliveryOtp: draft.deliveryOtp })}
        >
          <OtpTypeFields
            config={draft.deliveryOtp}
            showScopes
            scopedTemplates
            onChange={(deliveryOtp) => setDraft((current) => ({ ...current, deliveryOtp }))}
          />
          <TestSmsPanel
            label="Test delivery OTP SMS"
            otpType="delivery"
            scoped
            disabled={!draft.deliveryOtp.enabled || !settings.sms?.enabled}
            onTest={sendTestSms}
          />
        </SettingsCard>
      </div>
    </div>
  )
}
