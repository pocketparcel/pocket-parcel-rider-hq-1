import { MaterialIcon } from './materialIconCatalog'

function IconKeySelect({ value, onChange, options = [], label = 'Icon', required = false }) {
  const grouped = options.reduce((acc, item) => {
    const group = item.group || 'general'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="flex items-center gap-2">
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Select icon</option>
          {Object.entries(grouped).map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {value ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-brand-orange">
            <MaterialIcon iconKey={value} className="text-xl" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default IconKeySelect
