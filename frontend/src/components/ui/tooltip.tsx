import { useState, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export function Tooltip({
  label,
  children,
  side = "bottom",
}: {
  label: string
  children: ReactNode
  side?: "bottom" | "right"
}) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    if (side === "right") {
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 })
    } else {
      setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
    }
  }

  const handleEnter = () => {
    updatePosition()
    setShow(true)
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      onFocus={handleEnter}
      onBlur={() => setShow(false)}
    >
      {children}
      {show &&
        createPortal(
          <span
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: side === "right" ? "translateY(-50%)" : "translateX(-50%)",
            }}
            className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium shadow-medium z-50 pointer-events-none"
          >
            {label}
          </span>,
          document.body
        )}
    </div>
  )
}