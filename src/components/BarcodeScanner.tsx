import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flashlight, FlashlightOff, Keyboard, X } from 'lucide-react'
import { Button, IconButton, TextInput } from './ui'

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string; format: string }[]> }

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

/** Use the native BarcodeDetector where available (Chrome/Android), otherwise the ZXing WebAssembly ponyfill. */
async function createDetector(): Promise<Detector> {
  const Native = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats()
      const formats = FORMATS.filter((f) => supported.includes(f))
      if (formats.includes('ean_13')) return new Native({ formats })
    } catch {
      /* fall through to ponyfill */
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, wasm] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasm.default : prefix + path),
    },
  })
  return new BarcodeDetector({ formats: FORMATS as never }) as unknown as Detector
}

/** Valid EAN-13 / EAN-8 / UPC-A check digit. Other formats are accepted as-is. */
export function isPlausibleBarcode(code: string): boolean {
  if (!/^\d+$/.test(code)) return false
  if (![8, 12, 13].includes(code.length)) return code.length >= 6
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

export function BarcodeScanner({ open, onClose, onDetected }: { open: boolean; onClose: () => void; onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string>()
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torch, setTorch] = useState(false)
  const [manual, setManual] = useState(false)
  const [code, setCode] = useState('')
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  useEffect(() => {
    if (!open) return
    setError(undefined)
    setManual(false)
    setCode('')
    setTorch(false)
    let stream: MediaStream | undefined
    let stopped = false
    let timer: number | undefined
    const hits = new Map<string, number>()

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Dein Browser unterstützt keinen Kamerazugriff. Gib den Barcode manuell ein.')
        setManual(true)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch (e) {
        const name = (e as DOMException)?.name
        setError(
          name === 'NotAllowedError'
            ? 'Kamerazugriff wurde verweigert. Erlaube den Zugriff in den Browser-Einstellungen oder gib den Code manuell ein.'
            : 'Kamera konnte nicht gestartet werden. Gib den Barcode manuell ein.',
        )
        setManual(true)
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      const track = stream.getVideoTracks()[0]
      trackRef.current = track
      try {
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
        setTorchAvailable(!!caps?.torch)
      } catch {
        /* ignore */
      }

      let detector: Detector
      try {
        detector = await createDetector()
      } catch {
        setError('Der Barcode-Scanner konnte nicht geladen werden. Gib den Code manuell ein.')
        setManual(true)
        return
      }

      const tick = async () => {
        if (stopped) return
        if (video.readyState >= 2) {
          try {
            const results = await detector.detect(video)
            for (const r of results) {
              const value = r.rawValue.trim()
              if (!value) continue
              // Require the same code twice (or a valid check digit) to avoid misreads.
              const count = (hits.get(value) ?? 0) + 1
              hits.set(value, count)
              if (count >= 2 || isPlausibleBarcode(value)) {
                stopped = true
                navigator.vibrate?.(60)
                onDetectedRef.current(value)
                return
              }
            }
          } catch {
            /* keep scanning */
          }
        }
        timer = window.setTimeout(tick, 180)
      }
      void tick()
    }
    void start()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      trackRef.current = null
    }
  }, [open])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
      setTorch(!torch)
    } catch {
      setTorchAvailable(false)
    }
  }

  const submitManual = () => {
    const c = code.replace(/\D/g, '')
    if (c.length >= 6) onDetected(c)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[55] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Barcode scannen">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
      {/* Viewfinder */}
      {!manual && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-44 w-[78%] max-w-sm rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 rounded-3xl border-2 border-white/90" />
            <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-brand shadow-[0_0_12px_2px] shadow-brand" />
          </div>
        </div>
      )}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <IconButton label="Schließen" onClick={onClose} className="bg-black/40 text-white hover:bg-black/60 hover:text-white">
          <X className="size-6" />
        </IconButton>
        <span className="font-semibold">Barcode scannen</span>
        {torchAvailable ? (
          <IconButton label="Licht" onClick={toggleTorch} className="bg-black/40 text-white hover:bg-black/60 hover:text-white">
            {torch ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
          </IconButton>
        ) : (
          <span className="size-10" />
        )}
      </div>

      <div className="relative z-10 mt-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {error && <p className="mb-3 rounded-2xl bg-black/60 p-3 text-center text-sm">{error}</p>}
        {manual ? (
          <form
            className="rounded-3xl bg-surface p-4 text-ink"
            onSubmit={(e) => {
              e.preventDefault()
              submitManual()
            }}
          >
            <label className="mb-2 block text-sm font-medium text-ink-2" htmlFor="manual-barcode">
              Barcode (EAN) eingeben
            </label>
            <div className="flex gap-2">
              <TextInput id="manual-barcode" inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. 4000417025005" />
              <Button type="submit" disabled={code.replace(/\D/g, '').length < 6}>
                Suchen
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-white/80">Halte den Barcode in den Rahmen</p>
            <Button variant="secondary" icon={<Keyboard className="size-4" />} onClick={() => setManual(true)} className="border-white/20 bg-white/15 text-white hover:bg-white/25">
              Manuell eingeben
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
