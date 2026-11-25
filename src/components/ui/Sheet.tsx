import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton, cx } from './index'

let openSheets = 0

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  full,
  className,
  headerRight,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Take (almost) the full screen height. */
  full?: boolean
  className?: string
  headerRight?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    openSheets++
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    const prevFocus = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      openSheets--
      if (openSheets <= 0) document.body.style.overflow = ''
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          'relative flex w-full max-w-lg animate-sheet-up flex-col rounded-t-[28px] bg-surface shadow-float outline-none sm:animate-pop sm:rounded-[28px]',
          full ? 'h-[94dvh] sm:h-[86dvh]' : 'max-h-[92dvh] sm:max-h-[86dvh]',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-surface-3 sm:hidden" />
        {(title || headerRight) && (
          <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-3">
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">{title}</h2>
            {headerRight}
            <IconButton label="Schließen" onClick={onClose} className="-mr-2">
              <X className="size-5" />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
        {!footer && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>,
    document.body,
  )
}
