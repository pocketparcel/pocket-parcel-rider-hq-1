import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiColumns,
  FiDownload,
  FiSearch,
} from 'react-icons/fi'
import {
  exportToCsv,
  filterRows,
  getCellText,
  paginateRows,
  sortRows,
} from './dataTableUtils'

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]

function SortIndicator({ active, direction }) {
  if (!active) {
    return <FiChevronDown className="ml-1 inline text-slate-300" size={12} />
  }
  return direction === 'asc' ? (
    <FiChevronUp className="ml-1 inline text-brand-orange" size={12} />
  ) : (
    <FiChevronDown className="ml-1 inline text-brand-orange" size={12} />
  )
}

function DataTable({
  columns,
  data = [],
  rowKey = 'id',
  loading = false,
  emptyMessage = 'No records found.',
  searchPlaceholder = 'Search...',
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 25,
  enableSearch = true,
  enableColumnToggle = true,
  enableExport = true,
  enablePagination = true,
  enableRowSelection = false,
  dataMode = 'client', // 'client' | 'server'
  serverTotalRows,
  onQueryChange,
  searchDebounceMs = 300,
  exportFileName = 'export',
  minWidth = 960,
  fullWidth = false,
  maxHeight = 'calc(100vh - 240px)',
  className = '',
  onSelectionChange,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [showColumns, setShowColumns] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const columnMenuRef = useRef(null)

  const defaultVisibleKeys = useMemo(
    () =>
      new Set(
        columns.filter((col) => col.defaultVisible !== false).map((col) => col.key),
      ),
    [columns],
  )

  const [visibleKeys, setVisibleKeys] = useState(defaultVisibleKeys)

  useEffect(() => {
    setVisibleKeys(defaultVisibleKeys)
  }, [defaultVisibleKeys])

  useEffect(() => {
    if (dataMode === 'server') return
    setPage(1)
  }, [dataMode, searchQuery, pageSize, sortKey, sortDir])

  useEffect(() => {
    if (dataMode !== 'server') return
    setPage(1)
  }, [dataMode, debouncedSearchQuery, pageSize, sortKey, sortDir])

  useEffect(() => {
    if (dataMode !== 'server') {
      setDebouncedSearchQuery(searchQuery)
      return
    }

    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), searchDebounceMs)
    return () => clearTimeout(t)
  }, [searchQuery, dataMode, searchDebounceMs])

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumns(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleColumns = useMemo(
    () => columns.filter((col) => visibleKeys.has(col.key)),
    [columns, visibleKeys],
  )

  const filteredRows = useMemo(() => {
    if (dataMode === 'server') return data
    return filterRows(data, columns, searchQuery, visibleKeys)
  }, [dataMode, data, columns, searchQuery, visibleKeys])

  const sortedRows = useMemo(() => {
    if (dataMode === 'server') return filteredRows
    return sortRows(filteredRows, columns, sortKey, sortDir)
  }, [dataMode, filteredRows, columns, sortKey, sortDir])

  const totalRows = dataMode === 'server' ? serverTotalRows ?? sortedRows.length : sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPage = Math.min(page, totalPages)

  const pageRows = useMemo(() => {
    if (!enablePagination) return sortedRows
    if (dataMode === 'server') return sortedRows // data already represents the current page
    return paginateRows(sortedRows, currentPage, pageSize)
  }, [dataMode, sortedRows, currentPage, pageSize, enablePagination])

  const resolvedRowKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row, index)
    return row[rowKey] ?? index
  }

  const allPageKeys = pageRows.map((row, index) => resolvedRowKey(row, index))
  const allSelectedOnPage =
    allPageKeys.length > 0 && allPageKeys.every((key) => selectedKeys.has(key))

  function toggleSort(column) {
    if (column.sortable === false) return
    if (sortKey !== column.key) {
      setSortKey(column.key)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }
    setSortKey(null)
    setSortDir('asc')
  }

  function toggleColumn(key) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function emitSelectionChange(next) {
    if (!onSelectionChange) return
    const rows = data.filter((row, index) => next.has(resolvedRowKey(row, index)))
    onSelectionChange({ keys: [...next], rows })
  }

  function toggleRowSelection(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      emitSelectionChange(next)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allSelectedOnPage) {
        allPageKeys.forEach((key) => next.delete(key))
      } else {
        allPageKeys.forEach((key) => next.add(key))
      }
      emitSelectionChange(next)
      return next
    })
  }

  function handleExport() {
    const rowsToExport = dataMode === 'server' ? pageRows : sortedRows
    exportToCsv(rowsToExport, columns, visibleKeys, exportFileName)
  }

  const start = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalRows)

  useEffect(() => {
    if (dataMode !== 'server') return
    onQueryChange?.({
      page,
      pageSize,
      search: debouncedSearchQuery,
      sortBy: sortKey ?? undefined,
      sortDir: sortKey ? sortDir : undefined,
    })
  }, [dataMode, onQueryChange, page, pageSize, debouncedSearchQuery, sortKey, sortDir])

  const fillAvailableHeight = maxHeight === '100%'
  const cardStyle = fillAvailableHeight ? undefined : { maxHeight }

  return (
    <div className={`flex w-full min-w-0 max-w-full min-h-0 flex-col gap-3 overflow-hidden ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {enableSearch ? (
            <label className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange"
              />
            </label>
          ) : null}
          <span className="whitespace-nowrap text-xs text-slate-500">
            {totalRows} record{totalRows === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {enableColumnToggle ? (
            <div className="relative" ref={columnMenuRef}>
              <button
                type="button"
                onClick={() => setShowColumns((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FiColumns size={14} />
                Columns
              </button>
              {showColumns ? (
                <div className="absolute right-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  {columns.map((column) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={visibleKeys.has(column.key)}
                        onChange={() => toggleColumn(column.key)}
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {enableExport ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={sortedRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${
          fillAvailableHeight ? 'min-h-0 flex-1' : ''
        }`}
        style={cardStyle}
      >
        <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-auto overflow-y-auto">
          <table
            className={`border-collapse text-left text-xs ${
              fullWidth ? 'w-full min-w-full table-fixed' : ''
            }`}
            style={fullWidth ? { width: '100%' } : { minWidth }}
          >
            {fullWidth ? (
              <colgroup>
                {enableRowSelection ? <col style={{ width: '44px' }} /> : null}
                {visibleColumns.map((column) => {
                  const width =
                    column.width ??
                    (column.key === 'actions' || column.sticky === 'right'
                      ? '11rem'
                      : column.sticky === 'left'
                        ? '10rem'
                        : undefined)
                  return <col key={column.key} style={width ? { width } : undefined} />
                })}
              </colgroup>
            ) : null}
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {enableRowSelection ? (
                  <th className="sticky left-0 top-0 z-30 bg-slate-50 px-3 py-3 shadow-[1px_0_0_#e2e8f0]">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllOnPage}
                      aria-label="Select all rows on page"
                    />
                  </th>
                ) : null}
                {visibleColumns.map((column) => {
                  const stickyLeftCol = column.sticky === 'left'
                  const stickyRightCol = column.sticky === 'right'
                  const stickyLeft = enableRowSelection ? 44 : 0
                  return (
                    <th
                      key={column.key}
                      className={`sticky top-0 bg-slate-50 px-3 py-3 font-semibold ${
                        stickyLeftCol || stickyRightCol ? 'z-20' : 'z-10 whitespace-nowrap'
                      } ${stickyLeftCol ? 'shadow-[1px_0_0_#e2e8f0]' : ''} ${
                        stickyRightCol ? 'right-0 shadow-[-1px_0_0_#e2e8f0]' : ''
                      } ${column.headerClassName ?? ''}`}
                      style={
                        stickyLeftCol
                          ? { left: stickyLeft }
                          : stickyRightCol
                            ? { right: 0 }
                            : undefined
                      }
                    >
                      {column.sortable === false ? (
                        column.label
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className="inline-flex items-center hover:text-slate-800"
                        >
                          {column.label}
                          <SortIndicator
                            active={sortKey === column.key}
                            direction={sortDir}
                          />
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, rowIndex) => {
                  const key = resolvedRowKey(row, rowIndex)
                  const selected = selectedKeys.has(key)
                  return (
                    <tr
                      key={key}
                      className={`group border-t border-slate-100 hover:bg-slate-50/80 ${
                        selected ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {enableRowSelection ? (
                        <td
                          className={`sticky left-0 z-10 px-3 py-2 shadow-[1px_0_0_#f1f5f9] ${
                            selected
                              ? 'bg-orange-50/40'
                              : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleRowSelection(key)}
                            aria-label={`Select row ${key}`}
                          />
                        </td>
                      ) : null}
                      {visibleColumns.map((column) => {
                        const stickyLeftCol = column.sticky === 'left'
                        const stickyRightCol = column.sticky === 'right'
                        const stickyLeft = enableRowSelection ? 44 : 0
                        const content = column.render
                          ? column.render(row)
                          : getCellText(row[column.key])
                        const shrinkable =
                          fullWidth &&
                          column.key !== 'actions' &&
                          !stickyLeftCol &&
                          !stickyRightCol

                        return (
                          <td
                            key={column.key}
                            className={`px-3 py-2 text-slate-700 ${
                              shrinkable
                                ? 'max-w-0 truncate whitespace-nowrap'
                                : stickyLeftCol
                                  ? 'overflow-hidden align-top'
                                  : 'whitespace-nowrap'
                            } ${
                              stickyLeftCol || stickyRightCol
                                ? `sticky z-10 ${
                                    stickyLeftCol ? 'shadow-[1px_0_0_#f1f5f9]' : 'right-0 shadow-[-1px_0_0_#f1f5f9]'
                                  } ${
                                    selected
                                      ? 'bg-orange-50/40'
                                      : 'bg-white group-hover:bg-slate-50'
                                  }`
                                : ''
                            } ${column.className ?? ''}`}
                            style={
                              stickyLeftCol
                                ? { left: stickyLeft }
                                : stickyRightCol
                                  ? { right: 0 }
                                  : undefined
                            }
                          >
                            {content ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {enablePagination && !loading && totalRows > 0 ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-md border border-slate-200 px-2 py-1"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>
                {start}-{end} of {totalRows}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                aria-label="Previous page"
              >
                <FiChevronLeft />
              </button>
              <span className="min-w-20 text-center">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                aria-label="Next page"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default DataTable
