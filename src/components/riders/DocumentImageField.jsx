import { useRef, useState } from 'react'
import { FiImage, FiTrash2, FiUpload } from 'react-icons/fi'
import { readImageFileAsBase64 } from '../../utils/imageEncoding'

function DocumentImageField({
  label,
  previewSrc,
  onUpload,
  onRemove,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [localError, setLocalError] = useState('')

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setLocalError('')
      const base64 = await readImageFileAsBase64(file)
      onUpload?.(base64)
    } catch (err) {
      setLocalError(err.message || 'Failed to upload image')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>

      {previewSrc ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img
            src={previewSrc}
            alt={label}
            className="h-36 w-full object-contain bg-slate-100"
          />
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
          <div className="text-center">
            <FiImage className="mx-auto text-2xl" />
            <p className="mt-1 text-xs">No image</p>
          </div>
        </div>
      )}

      {localError ? (
        <p className="mt-2 text-xs text-rose-600">{localError}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <FiUpload className="text-sm" />
          {previewSrc ? 'Replace' : 'Upload'}
        </button>
        {previewSrc ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
          >
            <FiTrash2 className="text-sm" />
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

export default DocumentImageField
