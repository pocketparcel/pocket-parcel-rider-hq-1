import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function Tooltip({ label, children, className = '' }) {
  const triggerRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  if (!label) return children

  function showTooltip() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    })
    setVisible(true)
  }

  function hideTooltip() {
    setVisible(false)
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {visible
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            >
              {label}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
            </span>,
            document.body,
          )
        : null}
    </>
  )
}

export default Tooltip
