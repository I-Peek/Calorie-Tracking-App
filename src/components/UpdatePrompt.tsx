import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui'

/** Shows a banner when a new version of the app has been downloaded. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for updates every hour while the app is open.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center px-4">
      <div className="flex w-full max-w-md animate-pop items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-page shadow-float">
        <RefreshCw className="size-5 shrink-0 text-brand" />
        <span className="flex-1 text-sm font-medium">Neue Version verfügbar</span>
        <button type="button" className="px-2 text-sm text-page/70" onClick={() => setNeedRefresh(false)}>
          Später
        </button>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          Aktualisieren
        </Button>
      </div>
    </div>
  )
}
