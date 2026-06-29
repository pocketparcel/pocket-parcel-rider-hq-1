import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { adminApi } from '../config/api'

const emptyForm = {
  category: '',
  question: '',
  answer: '',
  sortOrder: 0,
  isActive: true,
}

function HelpFaqsPage({ adminToken, onUnauthorized }) {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

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

  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(adminApi.helpFaqs)
      setFaqs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load help FAQs')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    loadFaqs()
  }, [loadFaqs])

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return faqs
    return faqs.filter(
      (faq) =>
        faq.category?.toLowerCase().includes(query) ||
        faq.question?.toLowerCase().includes(query) ||
        faq.answer?.toLowerCase().includes(query),
    )
  }, [faqs, search])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(faq) {
    setEditingId(faq.id)
    setForm({
      category: faq.category || '',
      question: faq.question || '',
      answer: faq.answer || '',
      sortOrder: faq.sortOrder ?? 0,
      isActive: faq.isActive ?? true,
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.category.trim() || !form.question.trim() || !form.answer.trim()) {
      setError('Category, question, and answer are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const body = {
        category: form.category.trim(),
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: Boolean(form.isActive),
      }

      if (editingId) {
        await apiFetch(adminApi.helpFaqById(editingId), {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await apiFetch(adminApi.helpFaqs, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      closeForm()
      await loadFaqs()
    } catch (err) {
      setError(err.message || 'Failed to save FAQ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this FAQ?')) return

    try {
      setError('')
      await apiFetch(adminApi.helpFaqById(id), { method: 'DELETE' })
      await loadFaqs()
    } catch (err) {
      setError(err.message || 'Failed to delete FAQ')
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Help FAQs</h2>
          <p className="text-xs text-slate-600">
            Manage categories and answers shown in the rider app Help Center.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white"
        >
          <FiPlus size={14} />
          Add FAQ
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search category, question, or answer..."
          className="mb-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
        />

        {loading ? (
          <p className="text-sm text-slate-500">Loading FAQs...</p>
        ) : filteredFaqs.length === 0 ? (
          <p className="text-sm text-slate-500">No FAQs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Question</th>
                  <th className="px-2 py-2">Answer</th>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2 font-medium text-slate-800">{faq.category}</td>
                    <td className="px-2 py-2 text-slate-800">{faq.question}</td>
                    <td className="max-w-xs px-2 py-2 text-slate-600">
                      <p className="line-clamp-2">{faq.answer}</p>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{faq.sortOrder}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          faq.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {faq.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(faq)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          title="Edit FAQ"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(faq.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                          title="Delete FAQ"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingId ? 'Edit FAQ' : 'Add FAQ'}
              </h3>
              <button type="button" onClick={closeForm} className="text-slate-500">
                <FiX size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Category
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Earnings, Delivery, Account..."
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Question
                <input
                  value={form.question}
                  onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-700">
                Answer
                <textarea
                  value={form.answer}
                  onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
                  rows={4}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-medium text-slate-700">
                  Sort order
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sortOrder: event.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                  Active in rider app
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

export default HelpFaqsPage
