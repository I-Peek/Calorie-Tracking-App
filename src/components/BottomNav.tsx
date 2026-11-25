import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { BookOpen, ChartLine, Hourglass, Plus, UserRound, ScanBarcode, Droplet, Dumbbell, Scale, Zap } from 'lucide-react'
import { cx } from './ui'
import { Sheet } from './ui/Sheet'
import { MEALS, useWeightOn } from '../hooks/data'
import { useSelectedDate } from '../hooks/selectedDate'
import { mealForTime, relativeDayLabel } from '../lib/dates'
import { addWater } from '../db/repo'
import { useToast } from './ui/Toast'
import type { Profile } from '../db/types'
import { ActivitySheet } from './ActivitySheet'
import { WeightSheet } from './WeightSheet'
import { fmtInt } from '../lib/format'

const HIDDEN_PREFIXES = ['/add', '/food/', '/recipe/']

export function BottomNav({ profile }: { profile: Profile }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const navigate = useNavigate()
  const { date } = useSelectedDate()
  const weight = useWeightOn(date, profile) ?? profile.startWeightKg
  const toast = useToast()

  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const item = (to: string, label: string, Icon: typeof BookOpen) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cx('flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[11px] font-semibold transition', isActive ? 'text-brand' : 'text-ink-3 hover:text-ink-2')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-6" strokeWidth={isActive ? 2.4 : 2} />
          {label}
        </>
      )}
    </NavLink>
  )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl" aria-label="Hauptnavigation">
        <div className="mx-auto flex h-16 max-w-lg items-stretch px-2 pb-safe box-content">
          {item('/', 'Tagebuch', BookOpen)}
          {item('/fasting', 'Fasten', Hourglass)}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Schnell hinzufügen"
              onClick={() => setOpen(true)}
              className="-mt-7 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 ring-4 ring-page transition active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.6} />
            </button>
          </div>
          {item('/progress', 'Fortschritt', ChartLine)}
          {item('/profile', 'Profil', UserRound)}
        </div>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hinzufügen · ${relativeDayLabel(date)}`}>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => go(`/add?meal=${m.key}&date=${date}`)}
              className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left font-semibold transition hover:bg-surface-3 active:scale-[0.98]"
            >
              <span className="text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <QuickTile icon={<ScanBarcode className="size-5" />} label="Barcode scannen" tone="brand" onClick={() => go(`/add?meal=${mealForTime()}&date=${date}&scan=1`)} />
          <QuickTile icon={<Zap className="size-5" />} label="Schnelleintrag" tone="carbs" onClick={() => go(`/add?meal=${mealForTime()}&date=${date}&quick=1`)} />
          <QuickTile
            icon={<Droplet className="size-5" />}
            label={`Wasser +${fmtInt(profile.glassSizeMl)} ml`}
            tone="water"
            onClick={async () => {
              await addWater(date, profile.glassSizeMl)
              setOpen(false)
              toast.show(`${fmtInt(profile.glassSizeMl)} ml Wasser hinzugefügt 💧`)
            }}
          />
          <QuickTile
            icon={<Dumbbell className="size-5" />}
            label="Aktivität"
            tone="burn"
            onClick={() => {
              setOpen(false)
              setActivityOpen(true)
            }}
          />
          <QuickTile
            icon={<Scale className="size-5" />}
            label="Gewicht"
            tone="protein"
            onClick={() => {
              setOpen(false)
              setWeightOpen(true)
            }}
          />
        </div>
      </Sheet>
      <ActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} date={date} weightKg={weight} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} defaultKg={weight} />
    </>
  )
}

function QuickTile({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone: 'brand' | 'water' | 'burn' | 'protein' | 'carbs' }) {
  const color = { brand: 'var(--color-brand)', water: 'var(--color-water)', burn: 'var(--color-burn)', protein: 'var(--color-protein)', carbs: 'var(--color-carbs)' }[tone]
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left font-semibold transition hover:bg-surface-3 active:scale-[0.98]">
      <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        {icon}
      </span>
      <span className="text-[15px] leading-tight">{label}</span>
    </button>
  )
}
