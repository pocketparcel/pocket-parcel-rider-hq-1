import { useEffect, useId, useRef, useState } from 'react'
import { MaterialIcon } from './materialIconCatalog'

function CountryIconDropdown({
  value,
  onChange,
  options = [],
  label = 'Country icon',
  required = false,
  placeholder = 'Select country icon',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()
  const selected = options.find((item) => item.key === value)

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function selectIcon(iconKey) {
    onChange(iconKey)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {required ? ' *' : ''}
      </label>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-300"
      >
        {selected ? (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-orange">
              <MaterialIcon iconKey={selected.key} className="text-xl" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-900">{selected.label}</span>
              <span className="block text-xs text-slate-500">{selected.key}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-slate-500">{placeholder}</span>
        )}
        <span className="shrink-0 text-slate-400" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No country icons available</li>
          ) : (
            options.map((item) => {
              const isSelected = item.key === value
              return (
                <li key={item.key} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => selectIcon(item.key)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      isSelected ? 'bg-orange-50 text-brand-orange' : 'text-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                        isSelected ? 'bg-white' : 'bg-slate-100'
                      }`}
                    >
                      <MaterialIcon iconKey={item.key} className="text-xl" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.key}</span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default CountryIconDropdown
