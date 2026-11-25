import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from './ui'

export function PageHeader({ title, subtitle, back, right, large }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | (() => void); right?: ReactNode; large?: boolean }) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'function') back()
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }
  return (
    <header className="sticky top-0 z-30 -mx-4 bg-page/85 px-4 pt-safe backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-1 py-2">
        {back && (
          <IconButton label="Zurück" onClick={goBack} className="-ml-2">
            <ChevronLeft className="size-6" />
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={large ? 'truncate text-[28px] font-extrabold tracking-tight' : 'truncate text-lg font-bold'}>{title}</h1>
          {subtitle && <p className="truncate text-sm text-ink-3">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  )
}
