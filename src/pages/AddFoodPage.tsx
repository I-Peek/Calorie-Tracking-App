import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChefHat, ChevronDown, PencilLine, ScanBarcode, Zap, SearchX } from 'lucide-react'
import { db } from '../db/db'
import type { Food, MealType } from '../db/types'
import { MEALS, mealLabel } from '../hooks/data'
import { useSelectedDate } from '../hooks/selectedDate'
import { isValidISODate, mealForTime, relativeDayLabel, todayISO } from '../lib/dates'
import { fmtInt } from '../lib/format'
import { addEntry, addQuickEntry, deleteEntry, findFoodByBarcode } from '../db/repo'
import { fetchProductByBarcode, OffError } from '../lib/openfoodfacts'
import { sumNutrients } from '../lib/nutrition'
import { PageHeader } from '../components/PageHeader'
import { FoodSearch } from '../components/FoodSearch'
import { FoodAmountSheet, defaultAmount } from '../components/FoodAmountSheet'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { QuickAddSheet } from '../components/QuickAddSheet'
import { Sheet } from '../components/ui/Sheet'
import { Button, Spinner } from '../components/ui'
import { useToast } from '../components/ui/Toast'

const MEAL_KEYS = MEALS.map((m) => m.key)

type Lookup = { state: 'loading' | 'notfound' | 'error'; code: string; message?: string }

export function AddFoodPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { setDate } = useSelectedDate()

  const mealParam = params.get('meal') as MealType | null
  const meal: MealType = mealParam && MEAL_KEYS.includes(mealParam) ? mealParam : mealForTime()
  const dateParam = params.get('date')
  const date = isValidISODate(dateParam) ? dateParam : todayISO()

  const [selected, setSelected] = useState<Food>()
  const [scanOpen, setScanOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [mealPicker, setMealPicker] = useState(false)
  const [lookup, setLookup] = useState<Lookup>()

  // One-shot URL flags: ?scan=1, ?quick=1, ?open=<foodId>
  useEffect(() => {
    const scan = params.get('scan') === '1'
    const quick = params.get('quick') === '1'
    const open = Number(params.get('open'))
    if (!scan && !quick && !open) return
    if (scan) setScanOpen(true)
    if (quick) setQuickOpen(true)
    if (open) void db.foods.get(open).then((f) => f && setSelected(f))
    const next = new URLSearchParams(params)
    next.delete('scan')
    next.delete('quick')
    next.delete('open')
    setParams(next, { replace: true })
  }, [params, setParams])

  const mealEntries = useLiveQuery(() => db.entries.where('[date+meal]').equals([date, meal]).toArray(), [date, meal]) ?? []
  const mealTotal = useMemo(() => sumNutrients(mealEntries.map((e) => e.nutrients)), [mealEntries])

  const setMeal = (m: MealType) => {
    const next = new URLSearchParams(params)
    next.set('meal', m)
    setParams(next, { replace: true })
  }

  const done = () => {
    setDate(date)
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }

  const quickAdd = async (food: Food) => {
    const d = defaultAmount(food)
    const id = await addEntry({ date, meal, food, quantity: d.quantity, unit: d.unit })
    navigator.vibrate?.(20)
    toast.show(`${food.name} hinzugefügt`, { action: { label: 'Rückgängig', onClick: () => void deleteEntry(id) } })
  }

  const handleBarcode = async (code: string) => {
    setScanOpen(false)
    setLookup({ state: 'loading', code })
    try {
      const local = await findFoodByBarcode(code)
      if (local) {
        setLookup(undefined)
        setSelected(local)
        return
      }
      const food = await fetchProductByBarcode(code)
      if (food) {
        setLookup(undefined)
        setSelected(food)
      } else {
        setLookup({ state: 'notfound', code })
      }
    } catch (e) {
      setLookup({ state: 'error', code, message: e instanceof OffError ? e.message : 'Produkt konnte nicht geladen werden.' })
    }
  }

  const actions = (
    <div className="grid grid-cols-4 gap-2">
      <ActionTile icon={<ScanBarcode className="size-6" />} label="Scannen" onClick={() => setScanOpen(true)} primary />
      <ActionTile icon={<Zap className="size-6" />} label="Schnell" onClick={() => setQuickOpen(true)} />
      <ActionTile icon={<PencilLine className="size-6" />} label="Erstellen" onClick={() => navigate(`/food/new?meal=${meal}&date=${date}`)} />
      <ActionTile icon={<ChefHat className="size-6" />} label="Rezept" onClick={() => navigate('/recipe/new')} />
    </div>
  )

  return (
    <div className="pb-24">
      <PageHeader
        back={done}
        title={
          <button type="button" onClick={() => setMealPicker(true)} className="flex items-center gap-1 rounded-xl hover:text-ink-2">
            {mealLabel(meal)}
            <ChevronDown className="size-4 text-ink-3" />
          </button>
        }
        subtitle={relativeDayLabel(date)}
      />

      <FoodSearch onPick={setSelected} onQuickAdd={quickAdd} actions={actions} />

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              {mealLabel(meal)} · <span className="tnum">{fmtInt(mealTotal.kcal)} kcal</span>
            </div>
            <div className="text-xs text-ink-3 tnum">
              {mealEntries.length} {mealEntries.length === 1 ? 'Eintrag' : 'Einträge'} · K {fmtInt(mealTotal.carbs)} g · E {fmtInt(mealTotal.protein)} g · F {fmtInt(mealTotal.fat)} g
            </div>
          </div>
          <Button onClick={done}>Fertig</Button>
        </div>
      </div>

      <FoodAmountSheet
        open={!!selected}
        food={selected}
        onClose={() => setSelected(undefined)}
        initial={selected ? { ...defaultAmount(selected), meal } : undefined}
        onConfirm={async (r) => {
          if (!selected) return
          const id = await addEntry({ date, meal: r.meal, food: selected, quantity: r.quantity, unit: r.unit })
          setSelected(undefined)
          toast.show(r.meal === meal ? `${selected.name} hinzugefügt` : `${selected.name} zu ${mealLabel(r.meal)} hinzugefügt`, {
            action: { label: 'Rückgängig', onClick: () => void deleteEntry(id) },
          })
        }}
      />

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleBarcode} />

      <QuickAddSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        meal={meal}
        onSave={async (v) => {
          await addQuickEntry(date, v.meal, v.name, { kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat })
          setQuickOpen(false)
          toast.show(`${fmtInt(v.kcal)} kcal eingetragen`)
        }}
      />

      <Sheet open={mealPicker} onClose={() => setMealPicker(false)} title="Mahlzeit wählen">
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMeal(m.key)
                setMealPicker(false)
              }}
              className={`flex items-center gap-3 rounded-2xl p-3.5 text-left font-semibold ${m.key === meal ? 'bg-brand-soft text-brand-strong dark:text-brand' : 'bg-surface-2'}`}
            >
              <span className="text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!lookup} onClose={() => setLookup(undefined)} title={lookup?.state === 'loading' ? 'Produkt wird gesucht …' : 'Produkt nicht gefunden'}>
        {lookup?.state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8 text-ink-3">
            <Spinner className="size-8" />
            <span className="text-sm tnum">Barcode {lookup.code}</span>
          </div>
        )}
        {lookup && lookup.state !== 'loading' && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-3">
              <SearchX className="size-7" />
            </div>
            <p className="text-ink-2">
              {lookup.state === 'notfound'
                ? 'Für diesen Barcode gibt es noch keine Nährwerte in Open Food Facts. Lege das Produkt einfach selbst an – beim nächsten Scan wird es sofort erkannt.'
                : lookup.message}
            </p>
            <p className="mt-1 text-sm text-ink-3 tnum">Barcode: {lookup.code}</p>
            <div className="mt-5 grid gap-2">
              <Button size="lg" onClick={() => navigate(`/food/new?barcode=${lookup.code}&meal=${meal}&date=${date}`)}>
                Produkt anlegen
              </Button>
              {lookup.state === 'error' && (
                <Button variant="secondary" size="lg" onClick={() => void handleBarcode(lookup.code)}>
                  Erneut versuchen
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setLookup(undefined)
                  setScanOpen(true)
                }}
              >
                Erneut scannen
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function ActionTile({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold shadow-card transition active:scale-95 ${primary ? 'bg-brand text-white' : 'bg-surface text-ink-2 hover:text-ink'}`}
    >
      {icon}
      {label}
    </button>
  )
}
