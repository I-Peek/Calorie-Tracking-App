import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Ellipsis, Flame, GlassWater, Minus, Plus, Scale, Utensils, Zap, Trash } from 'lucide-react'
import { db } from '../db/db'
import type { ActivityEntry, DiaryEntry, Food, MealType, Profile } from '../db/types'
import { MEALS, mealLabel, useDay, useGoals, useWeightOn, type DayData, type Goals } from '../hooks/data'
import { useSelectedDate } from '../hooks/selectedDate'
import { addDays, formatDayMonth, relativeDayLabel, todayISO } from '../lib/dates'
import { fmt1, fmtGrams, fmtInt } from '../lib/format'
import { Card, IconButton, MacroDot, ProgressBar, Ring, cx } from '../components/ui'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { FoodAmountSheet } from '../components/FoodAmountSheet'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { ActivitySheet } from '../components/ActivitySheet'
import { WeightSheet } from '../components/WeightSheet'
import { FoodAvatar } from '../components/FoodAvatar'
import { activityEmoji } from '../lib/activities'
import {
  addWater,
  copyMeal,
  deleteEntry,
  previousDayWithMeal,
  restoreEntry,
  setWater,
  updateEntryAmount,
  updateQuickEntry,
} from '../db/repo'

export function DiaryPage({ profile }: { profile: Profile }) {
  const { date, setDate } = useSelectedDate()
  const day = useDay(date)
  const weight = useWeightOn(date, profile) ?? profile.startWeightKg
  const goals = useGoals(profile, weight)
  const streak = useStreak()

  const [editEntry, setEditEntry] = useState<DiaryEntry>()
  const [editActivity, setEditActivity] = useState<ActivityEntry>()
  const [activityOpen, setActivityOpen] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)

  return (
    <div>
      <DateHeader date={date} setDate={setDate} streak={streak} />

      {day && goals ? (
        <>
          <SummaryCard day={day} goals={goals} profile={profile} />

          <div className="mt-4 space-y-3">
            {MEALS.map((m) => (
              <MealCard key={m.key} meal={m.key} date={date} day={day} goals={goals} onEdit={setEditEntry} />
            ))}
          </div>

          <WaterCard date={date} ml={day.waterMl} goal={goals.waterMl} glass={profile.glassSizeMl} />

          <ActivityCard
            day={day}
            stepsGoal={profile.stepsGoal}
            countsToBudget={profile.addExerciseCalories}
            onAdd={() => {
              setEditActivity(undefined)
              setActivityOpen(true)
            }}
            onEdit={(a) => {
              setEditActivity(a)
              setActivityOpen(true)
            }}
          />

          <NutrientDetails day={day} goals={goals} />

          <WeightCard profile={profile} weight={weight} date={date} onAdd={() => setWeightOpen(true)} />
        </>
      ) : (
        <DiarySkeleton />
      )}

      <EntryEditor entry={editEntry} onClose={() => setEditEntry(undefined)} />
      <ActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} date={date} weightKg={weight} entry={editActivity} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} date={date <= todayISO() ? date : todayISO()} defaultKg={weight} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function useStreak(): number {
  const dates = useLiveQuery(() => db.entries.orderBy('date').uniqueKeys(), []) as string[] | undefined
  return useMemo(() => {
    if (!dates?.length) return 0
    const set = new Set(dates)
    let d = todayISO()
    if (!set.has(d)) d = addDays(d, -1)
    let n = 0
    while (set.has(d)) {
      n++
      d = addDays(d, -1)
    }
    return n
  }, [dates])
}

function DateHeader({ date, setDate, streak }: { date: string; setDate: (d: string) => void; streak: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const today = todayISO()
  return (
    <header className="sticky top-0 z-30 -mx-4 bg-page/85 px-4 pt-safe backdrop-blur-xl">
      <div className="flex h-16 items-center gap-1">
        <IconButton label="Vorheriger Tag" onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="size-6" />
        </IconButton>
        <div className="relative flex flex-1 justify-center">
          <button
            type="button"
            className="flex flex-col items-center rounded-2xl px-3 py-1 hover:bg-surface-2"
            onClick={() => {
              const el = inputRef.current
              if (!el) return
              try {
                el.showPicker()
              } catch {
                el.focus()
                el.click()
              }
            }}
          >
            <span className="flex items-center gap-1 text-lg font-extrabold tracking-tight">
              {relativeDayLabel(date)}
              <ChevronDown className="size-4 text-ink-3" />
            </span>
            {['Heute', 'Gestern', 'Morgen'].includes(relativeDayLabel(date)) && <span className="-mt-0.5 text-xs text-ink-3">{formatDayMonth(date)}</span>}
          </button>
          <input
            ref={inputRef}
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
        <IconButton label="Nächster Tag" onClick={() => setDate(addDays(date, 1))}>
          <ChevronRight className="size-6" />
        </IconButton>
      </div>
      <div className="pointer-events-none absolute right-16 top-[calc(env(safe-area-inset-top)+1.1rem)] flex gap-2">
        {date !== today && (
          <button type="button" onClick={() => setDate(today)} className="pointer-events-auto hidden rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong dark:text-brand min-[400px]:block">
            Heute
          </button>
        )}
      </div>
      {streak > 0 && (
        <div className="pointer-events-none absolute left-16 top-[calc(env(safe-area-inset-top)+1.1rem)] hidden items-center gap-1 rounded-full bg-burn/12 px-2 py-1 text-xs font-bold text-burn min-[400px]:flex" title={`${streak} Tage in Folge getrackt`}>
          <Flame className="size-3.5" fill="currentColor" />
          {streak}
        </div>
      )}
    </header>
  )
}

function SummaryCard({ day, goals, profile }: { day: DayData; goals: Goals; profile: Profile }) {
  const eaten = day.totals.kcal
  const budget = goals.kcal + (profile.addExerciseCalories ? day.burned : 0)
  const remaining = Math.round(budget - eaten)
  const over = remaining < 0

  return (
    <Card className="mt-1 overflow-hidden p-5">
      <div className="flex items-center justify-between gap-2">
        <Stat label="Gegessen" value={eaten} icon={<Utensils className="size-4" />} />
        <Ring value={eaten} max={budget} size={168} stroke={13}>
          <span className={cx('text-[40px] font-extrabold leading-none tracking-tight tnum', over ? 'text-danger' : 'text-ink')}>{fmtInt(Math.abs(remaining))}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">{over ? 'kcal zu viel' : 'kcal übrig'}</span>
          <span className="mt-1 text-[11px] text-ink-3 tnum">Ziel {fmtInt(budget)}</span>
        </Ring>
        <Stat label="Verbrannt" value={day.burned} icon={<Flame className="size-4" />} tone="burn" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <MacroProgress label="Kohlenhydrate" value={day.totals.carbs} goal={goals.macros.carbs} color="var(--color-carbs)" />
        <MacroProgress label="Eiweiß" value={day.totals.protein} goal={goals.macros.protein} color="var(--color-protein)" />
        <MacroProgress label="Fett" value={day.totals.fat} goal={goals.macros.fat} color="var(--color-fat)" />
      </div>
    </Card>
  )
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: 'burn' }) {
  return (
    <div className="flex w-[72px] flex-col items-center text-center">
      <span className={cx('flex size-8 items-center justify-center rounded-full', tone === 'burn' ? 'bg-burn/12 text-burn' : 'bg-brand-soft text-brand-strong dark:text-brand')}>{icon}</span>
      <span className="mt-1.5 text-xl font-bold tnum">{fmtInt(value)}</span>
      <span className="text-xs text-ink-3">{label}</span>
    </div>
  )
}

function MacroProgress({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-ink-2">{label}</div>
      <ProgressBar value={value} max={goal} color={color} height={6} />
      <div className="mt-1.5 text-xs text-ink-3 tnum">
        <span className="font-semibold text-ink">{fmtInt(value)}</span> / {fmtInt(goal)} g
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function entryAmountLabel(e: DiaryEntry): string {
  if (e.quick) return 'Schnelleintrag'
  if (e.unit === 'g' || e.unit === 'ml') return `${fmtGrams(e.quantity)} ${e.unit}`
  const q = e.quantity === 1 ? '' : `${fmt1(e.quantity)} × `
  return `${q}${e.unit} · ${fmtGrams(e.grams)} ${e.baseUnit}`
}

function MealCard({ meal, date, day, goals, onEdit }: { meal: MealType; date: string; day: DayData; goals: Goals; onEdit: (e: DiaryEntry) => void }) {
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const def = MEALS.find((m) => m.key === meal)!
  const entries = day.byMeal[meal]
  const total = day.mealTotals[meal]
  const recommended = Math.round(goals.kcal * def.share)
  const toast = useToast()

  const prevDate = useLiveQuery(() => (menu ? previousDayWithMeal(date, meal) : Promise.resolve(undefined)), [menu, date, meal])

  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{def.emoji}</span>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/add?meal=${meal}&date=${date}`)}>
          <div className="font-bold text-ink">{def.label}</div>
          <div className="text-sm text-ink-3 tnum">
            <span className={cx('font-semibold', total.kcal > recommended * 1.15 ? 'text-burn' : 'text-ink-2')}>{fmtInt(total.kcal)}</span> / {fmtInt(recommended)} kcal
          </div>
        </button>
        <IconButton label={`${def.label}: Optionen`} onClick={() => setMenu(true)}>
          <Ellipsis className="size-5" />
        </IconButton>
        <IconButton label={`${def.label} hinzufügen`} variant="soft" onClick={() => navigate(`/add?meal=${meal}&date=${date}`)}>
          <Plus className="size-5" strokeWidth={2.5} />
        </IconButton>
      </div>
      {entries.length > 0 && (
        <ul className="border-t border-line px-4">
          {entries.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onEdit(e)} className="flex w-full items-center gap-3 py-2.5 text-left">
                {e.quick ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-carbs/15 text-carbs">
                    <Zap className="size-4" />
                  </span>
                ) : (
                  <FoodAvatar food={{ imageUrl: e.imageUrl, baseUnit: e.baseUnit, source: 'custom' }} size="sm" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{e.name}</span>
                  <span className="block truncate text-xs text-ink-3">{[e.brand, entryAmountLabel(e)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="text-sm font-semibold text-ink-2 tnum">{fmtInt(e.nutrients.kcal)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 0 && (
        <div className="flex gap-3 border-t border-line px-4 py-2 text-[11px] text-ink-3 tnum">
          <span className="flex items-center gap-1"><MacroDot color="var(--color-carbs)" />K {fmtInt(total.carbs)} g</span>
          <span className="flex items-center gap-1"><MacroDot color="var(--color-protein)" />E {fmtInt(total.protein)} g</span>
          <span className="flex items-center gap-1"><MacroDot color="var(--color-fat)" />F {fmtInt(total.fat)} g</span>
        </div>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={def.label}>
        <div className="space-y-2">
          <MenuButton
            icon={<Copy className="size-5" />}
            disabled={!prevDate}
            label={prevDate ? `Von ${relativeDayLabel(prevDate)} kopieren` : 'Nichts zum Kopieren gefunden'}
            sub={prevDate ? 'Alle Einträge dieser Mahlzeit übernehmen' : 'In den letzten 14 Tagen gibt es keine Einträge'}
            onClick={async () => {
              if (!prevDate) return
              const n = await copyMeal(prevDate, date, meal)
              setMenu(false)
              toast.show(`${n} ${n === 1 ? 'Eintrag' : 'Einträge'} kopiert`)
            }}
          />
          <MenuButton
            icon={<Zap className="size-5" />}
            label="Schnelleintrag"
            sub="Nur Kalorien (und Makros) eintragen"
            onClick={() => {
              setMenu(false)
              navigate(`/add?meal=${meal}&date=${date}&quick=1`)
            }}
          />
          {entries.length > 0 && (
            <MenuButton
              icon={<Trash className="size-5" />}
              danger
              label="Alle Einträge löschen"
              sub={`${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'} aus ${def.label}`}
              onClick={async () => {
                const backup = [...entries]
                await db.entries.bulkDelete(backup.map((e) => e.id!))
                setMenu(false)
                toast.show(`${def.label} geleert`, { action: { label: 'Rückgängig', onClick: () => void db.entries.bulkPut(backup) } })
              }}
            />
          )}
        </div>
      </Sheet>
    </Card>
  )
}

function MenuButton({ icon, label, sub, onClick, disabled, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left transition hover:bg-surface-3 disabled:opacity-50">
      <span className={cx('flex size-9 items-center justify-center rounded-xl', danger ? 'bg-danger/12 text-danger' : 'bg-surface text-ink-2')}>{icon}</span>
      <span>
        <span className={cx('block font-semibold', danger && 'text-danger')}>{label}</span>
        {sub && <span className="block text-sm text-ink-3">{sub}</span>}
      </span>
    </button>
  )
}

function EntryEditor({ entry, onClose }: { entry?: DiaryEntry; onClose: () => void }) {
  const toast = useToast()
  const storedFood = useLiveQuery(async (): Promise<Food | undefined> => (entry?.foodId ? db.foods.get(entry.foodId) : undefined), [entry?.foodId])

  const food: Food | undefined = useMemo(() => {
    if (!entry || entry.quick || !entry.per100) return undefined
    return {
      id: storedFood?.id ?? entry.foodId,
      source: storedFood?.source ?? 'custom',
      sourceKey: storedFood?.sourceKey,
      barcode: storedFood?.barcode,
      name: entry.name,
      brand: entry.brand,
      imageUrl: entry.imageUrl,
      category: storedFood?.category,
      nutriScore: storedFood?.nutriScore,
      baseUnit: entry.baseUnit,
      per100: entry.per100,
      servings: entry.servings ?? [],
      createdAt: 0,
    }
  }, [entry, storedFood])

  const remove = async () => {
    if (!entry?.id) return
    const backup = entry
    await deleteEntry(entry.id)
    onClose()
    toast.show(`${backup.name} gelöscht`, { action: { label: 'Rückgängig', onClick: () => void restoreEntry(backup) } })
  }

  if (entry?.quick) {
    return (
      <QuickAddSheet
        open
        onClose={onClose}
        meal={entry.meal}
        entry={entry}
        onDelete={remove}
        onSave={async (v) => {
          await updateQuickEntry(entry.id!, v.name, { kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat }, v.meal)
          onClose()
          toast.show('Gespeichert')
        }}
      />
    )
  }

  return (
    <FoodAmountSheet
      open={!!entry && !!food}
      onClose={onClose}
      food={food}
      initial={entry ? { quantity: entry.quantity, unit: entry.unit, meal: entry.meal } : undefined}
      confirmLabel="Speichern"
      onDelete={remove}
      onConfirm={async (r) => {
        if (!entry) return
        await updateEntryAmount(entry, r.quantity, r.unit, r.meal)
        onClose()
        toast.show(r.meal !== entry.meal ? `Verschoben nach ${mealLabel(r.meal)}` : 'Gespeichert')
      }}
    />
  )
}

// ---------------------------------------------------------------------------

function WaterCard({ date, ml, goal, glass }: { date: string; ml: number; goal: number; glass: number }) {
  const count = Math.min(12, Math.max(1, Math.ceil(goal / glass)))
  const filled = Math.floor(ml / glass + 1e-6)
  const reached = ml >= goal
  return (
    <Card className="mt-3">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-water/12 text-water">
          <GlassWater className="size-6" />
        </span>
        <div className="flex-1">
          <div className="font-bold">Wasser</div>
          <div className="text-sm text-ink-3 tnum">
            <span className="font-semibold text-ink-2">{fmt1(ml / 1000)} l</span> / {fmt1(goal / 1000)} l {reached && '· Ziel erreicht 🎉'}
          </div>
        </div>
        <IconButton label={`${glass} ml entfernen`} variant="secondary" disabled={ml <= 0} onClick={() => void addWater(date, -glass)}>
          <Minus className="size-5" />
        </IconButton>
        <IconButton label={`${glass} ml hinzufügen`} variant="plain" className="bg-water text-white hover:brightness-110" onClick={() => void addWater(date, glass)}>
          <Plus className="size-5" />
        </IconButton>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-x-1.5 gap-y-2">
        {Array.from({ length: Math.max(count, filled) }, (_, i) => {
          const full = i < filled
          return (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}. Glas`}
              onClick={() => void setWater(date, full && i === filled - 1 ? i * glass : (i + 1) * glass)}
              className="flex h-11 items-end justify-center transition active:scale-90"
            >
              <svg viewBox="0 0 24 30" className="h-full w-auto">
                <path d="M3 2h18l-2.2 24.2A2 2 0 0 1 16.8 28H7.2a2 2 0 0 1-2-1.8L3 2z" fill={full ? 'var(--color-water)' : 'none'} fillOpacity={full ? 0.85 : 0} stroke={full ? 'var(--color-water)' : 'var(--color-surface-3)'} strokeWidth={2} strokeLinejoin="round" />
                {!full && i === filled && <path d="M12 11v8M8 15h8" stroke="var(--color-ink-3)" strokeWidth={1.8} strokeLinecap="round" />}
              </svg>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function ActivityCard({ day, stepsGoal, countsToBudget, onAdd, onEdit }: { day: DayData; stepsGoal: number; countsToBudget: boolean; onAdd: () => void; onEdit: (a: ActivityEntry) => void }) {
  const steps = day.activities.reduce((a, x) => a + (x.steps ?? 0), 0)
  return (
    <Card className="mt-3 p-0">
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-burn/12 text-burn">
          <Flame className="size-6" />
        </span>
        <div className="flex-1">
          <div className="font-bold">Aktivitäten</div>
          <div className="text-sm text-ink-3 tnum">
            <span className="font-semibold text-ink-2">{fmtInt(day.burned)} kcal</span> verbrannt{!countsToBudget && day.burned > 0 && ' · nicht im Budget'}
          </div>
        </div>
        <IconButton label="Aktivität hinzufügen" variant="plain" onClick={onAdd} className="bg-burn/12 text-burn">
          <Plus className="size-5" strokeWidth={2.5} />
        </IconButton>
      </div>
      {steps > 0 && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium">👣 Schritte</span>
            <span className="text-ink-3 tnum">
              <span className="font-semibold text-ink">{fmtInt(steps)}</span> / {fmtInt(stepsGoal)}
            </span>
          </div>
          <ProgressBar value={steps} max={stepsGoal} color="var(--color-burn)" height={6} />
        </div>
      )}
      {day.activities.length > 0 && (
        <ul className="border-t border-line px-4">
          {day.activities.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onEdit(a)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-lg">{activityEmoji(a.activityKey)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{a.name}</span>
                  <span className="text-xs text-ink-3 tnum">{a.steps ? `${fmtInt(a.steps)} Schritte` : a.minutes ? `${fmtInt(a.minutes)} min` : 'Manuell'}</span>
                </span>
                <span className="text-sm font-semibold text-burn tnum">−{fmtInt(a.kcal)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function NutrientDetails({ day, goals }: { day: DayData; goals: Goals }) {
  const [open, setOpen] = useState(false)
  const t = day.totals
  const rows = [
    { label: 'Zucker', value: t.sugar ?? 0, ref: 50, kind: 'max' as const, hint: 'max. empfohlen' },
    { label: 'Ballaststoffe', value: t.fiber ?? 0, ref: 30, kind: 'min' as const, hint: 'Ziel' },
    { label: 'Gesättigte Fettsäuren', value: t.saturatedFat ?? 0, ref: Math.round((goals.kcal * 0.1) / 9), kind: 'max' as const, hint: 'max. empfohlen' },
    { label: 'Salz', value: t.salt ?? 0, ref: 6, kind: 'max' as const, hint: 'max. empfohlen' },
  ]
  return (
    <Card className="mt-3 p-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-protein/12 text-xl">🔬</span>
        <span className="flex-1">
          <span className="block font-bold">Weitere Nährwerte</span>
          <span className="text-sm text-ink-3">Zucker, Ballaststoffe, Fettsäuren, Salz</span>
        </span>
        <ChevronDown className={cx('size-5 text-ink-3 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {rows.map((r) => {
            const bad = r.kind === 'max' ? r.value > r.ref : false
            return (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-ink-3 tnum">
                    <span className={cx('font-semibold', bad ? 'text-danger' : 'text-ink')}>{fmtGrams(r.value)} g</span> / {fmtInt(r.ref)} g {r.hint}
                  </span>
                </div>
                <ProgressBar value={r.value} max={r.ref} color={r.kind === 'min' ? 'var(--color-brand)' : 'var(--color-ink-3)'} height={6} />
              </div>
            )
          })}
          <p className="text-xs text-ink-3">Richtwerte nach Empfehlungen von WHO/DGE. Nicht alle Lebensmittel enthalten vollständige Angaben.</p>
        </div>
      )}
    </Card>
  )
}

function WeightCard({ profile, weight, date, onAdd }: { profile: Profile; weight: number; date: string; onAdd: () => void }) {
  const navigate = useNavigate()
  const todays = useLiveQuery(() => db.weights.get(date), [date])
  const diff = weight - profile.goalWeightKg
  return (
    <Card className="mt-3">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-protein/12 text-protein">
          <Scale className="size-6" />
        </span>
        <button type="button" className="flex-1 text-left" onClick={() => navigate('/progress')}>
          <div className="font-bold">Gewicht</div>
          <div className="text-sm text-ink-3 tnum">
            <span className="font-semibold text-ink-2">{fmt1(weight)} kg</span>
            {profile.goal !== 'maintain' && Math.abs(diff) >= 0.1 && <> · noch {fmt1(Math.abs(diff))} kg bis zum Ziel</>}
            {profile.goal !== 'maintain' && Math.abs(diff) < 0.1 && <> · Ziel erreicht 🎉</>}
          </div>
        </button>
        <IconButton label="Gewicht eintragen" variant="plain" onClick={onAdd} className="bg-protein/12 text-protein">
          {todays ? <span className="text-xs font-bold">✓</span> : <Plus className="size-5" strokeWidth={2.5} />}
        </IconButton>
      </div>
    </Card>
  )
}

function DiarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-72 animate-pulse rounded-3xl bg-surface" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface" />
      ))}
    </div>
  )
}
