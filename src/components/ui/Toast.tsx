import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, Info, TriangleExclamationPoint } from 'lucide-react'
import { cx } from './index'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'info' | 'error'
  action?: ToastAction
}

interface ToastApi {
  show: (message: string, opts?: { tone?: ToastItem['tone']; action?: ToastAction; duration?: number }) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    (message, opts) => {
      const id = nextId.current++
      setItems((l) => [...l.slice(-1), { id, message, tone: opts?.tone ?? 'success', action: opts?.action }])
      window.setTimeout(() => dismiss(id), opts?.duration ?? (opts?.action ? 4000 : 2200))
    },
    [dismiss],
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-md animate-pop items-center gap-3 rounded-2xl bg-ink/95 px-4 py-2.5 text-sm text-page shadow-float backdrop-blur"
          >
            {t.tone === 'success' && <CircleCheck className="size-5 shrink-0 text-brand" />}
            {t.tone === 'info' && <Info className="size-5 shrink-0 text-water" />}
            {t.tone === 'error' && <TriangleExclamationPoint className="size-5 shrink-0 text-danger" />}
            <span className="line-clamp-2 flex-1 font-medium">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className={cx('-my-1 rounded-lg px-2 py-1 font-bold text-brand hover:bg-white/10')}
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
