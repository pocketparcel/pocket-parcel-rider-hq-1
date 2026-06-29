export function getCellText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  return String(value)
}

export function defaultSortValue(row, column) {
  const value = column.getSortValue ? column.getSortValue(row) : row[column.key]
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  return String(value).toLowerCase()
}

export function filterRows(rows, columns, query, visibleKeys) {
  const q = query.trim().toLowerCase()
  if (!q) return rows

  const activeColumns = columns.filter((col) => visibleKeys.has(col.key))

  return rows.filter((row) =>
    activeColumns.some((column) => {
      const text = column.getSearchValue
        ? column.getSearchValue(row)
        : getCellText(column.getSortValue ? column.getSortValue(row) : row[column.key])
      return getCellText(text).toLowerCase().includes(q)
    }),
  )
}

export function sortRows(rows, columns, sortKey, sortDir) {
  if (!sortKey || !sortDir) return rows

  const column = columns.find((col) => col.key === sortKey)
  if (!column) return rows

  const sorted = [...rows].sort((a, b) => {
    const left = defaultSortValue(a, column)
    const right = defaultSortValue(b, column)

    if (typeof left === 'number' && typeof right === 'number') {
      return left - right
    }

    return String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })

  return sortDir === 'desc' ? sorted.reverse() : sorted
}

export function paginateRows(rows, page, pageSize) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

export function exportToCsv(rows, columns, visibleKeys, fileName) {
  const activeColumns = columns.filter((col) => visibleKeys.has(col.key))
  const header = activeColumns.map((col) => col.label)
  const lines = rows.map((row) =>
    activeColumns
      .map((col) => {
        const raw = col.getExportValue
          ? col.getExportValue(row)
          : col.getSortValue
            ? col.getSortValue(row)
            : row[col.key]
        const text = getCellText(raw).replace(/"/g, '""')
        return `"${text}"`
      })
      .join(','),
  )

  const csv = [header.map((item) => `"${item}"`).join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
