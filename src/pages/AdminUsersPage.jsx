import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiX } from 'react-icons/fi'
import DataTable from '../components/data-table/DataTable'
import { adminApi } from '../config/api'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
  isActive: true,
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

function RolePill({ role }) {
  const isSuper = role === 'super_admin'
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        isSuper ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
      }`}
    >
      {isSuper ? 'Super Admin' : 'Admin'}
    </span>
  )
}

function StatusPill({ active }) {
  return active ? (
    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
      Disabled
    </span>
  )
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id="admin-user-modal-title" className="text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}

function FormField({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  )
}

function inputClassName() {
  return 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange'
}

function buildAdminUserColumns(onEdit, currentUserId) {
  return [
    {
      key: 'name',
      label: 'Name',
      sticky: 'left',
      getSortValue: (row) => row.name,
      getSearchValue: (row) => [row.name, row.email, row.role].filter(Boolean).join(' '),
      render: (row) => (
        <span className="font-medium text-slate-900">
          {displayValue(row.name)}
          {row.id === currentUserId ? (
            <span className="ml-1.5 text-[10px] font-normal text-slate-500">(you)</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      getSortValue: (row) => row.email,
      render: (row) => displayValue(row.email),
    },
    {
      key: 'role',
      label: 'Role',
      getSortValue: (row) => row.role,
      getSearchValue: (row) => (row.role === 'super_admin' ? 'super admin' : 'admin'),
      render: (row) => <RolePill role={row.role} />,
      getExportValue: (row) => (row.role === 'super_admin' ? 'Super Admin' : 'Admin'),
    },
    {
      key: 'isActive',
      label: 'Status',
      getSortValue: (row) => (row.isActive ? 1 : 0),
      getSearchValue: (row) => (row.isActive ? 'active' : 'disabled'),
      render: (row) => <StatusPill active={row.isActive} />,
      getExportValue: (row) => (row.isActive ? 'Active' : 'Disabled'),
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
    {
      key: 'actions',
      label: 'Actions',
      sticky: 'right',
      defaultVisible: true,
      sortable: false,
      getSearchValue: () => '',
      render: (row) => (
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
        >
          <FiEdit2 className="text-sm" />
          Edit
        </button>
      ),
      getExportValue: () => '',
    },
  ]
}

function AdminUsersPage({ adminToken, adminUser, onUnauthorized }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalMode, setModalMode] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(adminApi.adminUsers)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (adminToken && adminUser?.role === 'super_admin') loadUsers()
  }, [adminToken, adminUser?.role, loadUsers])

  function closeModal() {
    setModalMode(null)
    setEditingUser(null)
    setForm(EMPTY_FORM)
  }

  function openCreateModal() {
    setError('')
    setSuccess('')
    setModalMode('create')
    setEditingUser(null)
    setForm(EMPTY_FORM)
  }

  function openEditModal(user) {
    setError('')
    setSuccess('')
    setModalMode('edit')
    setEditingUser(user)
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      role: user.role ?? 'admin',
      isActive: user.isActive ?? true,
    })
  }

  const columns = useMemo(
    () => buildAdminUserColumns(openEditModal, adminUser?.id),
    [adminUser?.id],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (modalMode === 'create') {
        await apiFetch(adminApi.adminUsers, {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        })
        setSuccess('Admin user created')
      } else if (modalMode === 'edit' && editingUser) {
        await apiFetch(adminApi.adminUserById(editingUser.id), {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            isActive: form.isActive,
          }),
        })

        if (form.password.trim().length >= 8) {
          await apiFetch(adminApi.adminUserPassword(editingUser.id), {
            method: 'PATCH',
            body: JSON.stringify({ password: form.password }),
          })
        }

        setSuccess('Admin user updated')
      }

      closeModal()
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to save admin user')
    } finally {
      setSaving(false)
    }
  }

  const isSelf = editingUser?.id === adminUser?.id
  const modalTitle = modalMode === 'create' ? 'Add admin user' : 'Edit admin user'

  if (adminUser?.role !== 'super_admin') {
    return (
      <section className="min-w-0 max-w-full space-y-4 overflow-hidden">
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">Admin Users</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Only super admins can manage platform users.
        </p>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-semibold leading-none text-slate-900">Admin Users</h1>
          <p className="mt-2 text-sm text-slate-600">
            Search, sort, and export platform accounts. Disabled users cannot sign in until re-enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <FiPlus />
          Add user
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

      <DataTable
        className="min-h-0 flex-1"
        columns={columns}
        data={users}
        rowKey="id"
        loading={loading}
        emptyMessage="No admin users yet."
        searchPlaceholder="Search users by name, email, role, status..."
        exportFileName="pocket-parcel-admin-users"
        fullWidth
        maxHeight="100%"
        defaultPageSize={25}
        enableRowSelection
      />

      <Modal
        open={modalMode !== null}
        title={modalTitle}
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-user-form"
              disabled={saving}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : modalMode === 'create' ? 'Create user' : 'Save changes'}
            </button>
          </div>
        }
      >
        <form id="admin-user-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className={inputClassName()}
              placeholder="Jane Doe"
            />
          </FormField>

          <FormField label="Email address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className={inputClassName()}
              placeholder="jane@pocketparcel.com"
            />
          </FormField>

          <FormField label="Role">
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className={inputClassName()}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          {modalMode === 'create' ? (
            <FormField label="Password" hint="Minimum 8 characters.">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={8}
                className={inputClassName()}
                placeholder="Enter password"
              />
            </FormField>
          ) : (
            <>
              <FormField
                label="New password"
                hint="Leave blank to keep the current password. Minimum 8 characters when changing."
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  minLength={8}
                  className={inputClassName()}
                  placeholder="Optional new password"
                />
              </FormField>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  disabled={isSelf}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Account active
                {isSelf ? (
                  <span className="text-xs text-slate-500">You cannot deactivate your own account.</span>
                ) : null}
              </label>
            </>
          )}
        </form>
      </Modal>
    </section>
  )
}

export default AdminUsersPage
