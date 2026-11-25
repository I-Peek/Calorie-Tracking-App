import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Star, Trash } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './ui/Sheet'
import { Button, IconButton, MacroDot, NumberInput, NutriScore, cx } from './ui'
import { FoodAvatar } from './FoodAvatar'
import type { Food, MealType, Nutrients } from '../db/types'
import { scaleNutrients, toBaseAmount } from '../lib/nutrition'
import { fmtGrams, fmtInt } from '../lib/format'
import { MEALS } from '../hooks/data'
import { db } from '../db/db'
import { toggleFavorite } from '../db/repo'

export interface AmountResult {
  quantity: number
  unit: string
  grams: number
  meal: MealType
}

export function defaultAmount(food: Food): { quantity: number; unit: string } {
  if (food.servings.length > 0) return { quantity: 1, unit: food.servings[0].label }
  return { quantity: 100, unit: food.baseUnit }
}

export function FoodAmountSheet({
  open,
  onClose,
  food,
  initial,
  showMeal = true,
  confirmLabel = 'Hinzufügen',
  onConfirm,
  onDelete,
  allowFavorite = true,
}: {
  allowFavorite?: boolean
  open: boolean
  onClose: () => void
  food: Food | undefined
  initial?: { quantity: number; unit: string; meal?: MealType }
  showMeal?: boolean
  confirmLabel?: string
  onConfirm: (r: AmountResult) => void | Promise<void>
  onDelete?: () => void
}) {
  const [quantity, setQuantity] = useState<number | undefined>(1)
  const [unit, setUnit] = useState('g')
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !food) return
    const d = initial ?? defaultAmount(food)
    setQuantity(d.quantity)
    setUnit(d.unit)
    setMeal(initial?.meal ?? 'breakfast')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, food?.id, food?.sourceKey, food?.name])

  // Live favourite state from the database (food may not be stored yet).
  const storedFav = useLiveQuery(async () => {
    if (!food) return 0
    if (food.id) return (await db.foods.get(food.id))?.favorite ?? 0
    if (food.sourceKey) {
      const f = await db.foods.where('sourceKey').equals(food.sourceKey).filter((x) => x.source === food.source).first()
      return f?.favorite ?? 0
    }
    return 0
  }, [food?.id, food?.sourceKey, food?.source])

  const units = useMemo(() => {
    if (!food) return []
    return [...food.servings.map((s) => ({ label: s.label, amount: s.amount })), { label: food.baseUnit, amount: 1 }]
  }, [food])

  if (!food) return null

  const isBase = unit === 'g' || unit === 'ml'
  const grams = toBaseAmount(quantity ?? 0, unit, food.servings)
  const n = scaleNutrients(food.per100, grams)
  const valid = (quantity ?? 0) > 0

  const changeUnit = (u: string) => {
    if (u === unit) return
    if (u === 'g' || u === 'ml') setQuantity(Math.round(grams) || 100)
    else setQuantity(1)
    setUnit(u)
  }

  const step = isBase ? (grams >= 100 ? 25 : 10) : 0.5
  const bump = (dir: 1 | -1) => setQuantity((q) => Math.max(0, Math.round(((q ?? 0) + dir * step) * 100) / 100))

  const confirm = async () => {
    if (!valid || quantity === undefined) return
    setBusy(true)
    try {
      await onConfirm({ quantity, unit, grams, meal })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      headerRight={
        allowFavorite ? <IconButton
          label={storedFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
          onClick={() => void toggleFavorite(food)}
          className={storedFav ? 'text-amber-500' : ''}
        >
          <Star className="size-5" fill={storedFav ? 'currentColor' : 'none'} />
        </IconButton> : <span />
      }
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Löschen" className="px-4">
              <Trash className="size-5" />
            </Button>
          )}
          <Button size="lg" block onClick={confirm} disabled={!valid} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <FoodAvatar food={food} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="text-xl font-bold leading-tight text-ink">{food.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-3">
            {food.brand && <span className="truncate">{food.brand}</span>}
            <NutriScore grade={food.nutriScore} />
            {food.source === 'recipe' && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">Rezept</span>}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-5 flex items-center gap-2">
        <IconButton label="Weniger" variant="secondary" onClick={() => bump(-1)} className="size-12">
          <Minus className="size-5" />
        </IconButton>
        <NumberInput value={quantity} onChange={setQuantity} decimals={2} aria-label="Menge" className="flex-1 [&_input]:h-12 [&_input]:text-center [&_input]:text-xl [&_input]:font-bold" />
        <IconButton label="Mehr" variant="secondary" onClick={() => bump(1)} className="size-12">
          <Plus className="size-5" />
        </IconButton>
      </div>
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
        {units.map((u) => (
          <button
            key={u.label}
            type="button"
            onClick={() => changeUnit(u.label)}
            className={cx(
              'h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition',
              unit === u.label ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2 hover:bg-surface-2',
            )}
          >
            {u.label === 'g' ? 'Gramm' : u.label === 'ml' ? 'Milliliter' : u.label}
            {u.label !== 'g' && u.label !== 'ml' && !/\d\s*(g|ml)\)?$/.test(u.label) && <span className="ml-1 font-normal text-ink-3">({fmtGrams(u.amount)} {food.baseUnit})</span>}
          </button>
        ))}
      </div>
      {!isBase && (
        <p className="mt-1 px-1 text-xs text-ink-3">
          = {fmtGrams(grams)} {food.baseUnit}
        </p>
      )}

      {/* Meal */}
      {showMeal && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMeal(m.key)}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-2xl border py-2 text-xs font-semibold transition',
                meal === m.key ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2 hover:bg-surface-2',
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Nutrition */}
      <div className="mt-5 rounded-3xl bg-surface-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-ink tnum">{fmtInt(n.kcal)}</div>
            <div className="text-sm text-ink-3">kcal</div>
          </div>
          <MacroSplitBar n={n} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MacroCell label="Kohlenhydrate" value={n.carbs} color="var(--color-carbs)" />
          <MacroCell label="Eiweiß" value={n.protein} color="var(--color-protein)" />
          <MacroCell label="Fett" value={n.fat} color="var(--color-fat)" />
        </div>
      </div>

      <NutritionTable per100={food.per100} amount={grams} unit={food.baseUnit} />
    </Sheet>
  )
}

function MacroCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-surface p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
        <MacroDot color={color} />
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-ink tnum">{fmtGrams(value)} g</div>
    </div>
  )
}

/** Small stacked bar showing the energy share of carbs / protein / fat. */
export function MacroSplitBar({ n }: { n: Nutrients }) {
  const c = n.carbs * 4
  const p = n.protein * 4
  const f = n.fat * 9
  const total = c + p + f
  if (total <= 0) return null
  const pct = (v: number) => Math.round((v / total) * 100)
  return (
    <div className="w-36">
      <div className="flex h-2 overflow-hidden rounded-full">
        <div style={{ width: `${(c / total) * 100}%`, background: 'var(--color-carbs)' }} />
        <div style={{ width: `${(p / total) * 100}%`, background: 'var(--color-protein)' }} />
        <div style={{ width: `${(f / total) * 100}%`, background: 'var(--color-fat)' }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-ink-3 tnum">
        <span style={{ color: 'var(--color-carbs)' }}>{pct(c)} %</span>
        <span style={{ color: 'var(--color-protein)' }}>{pct(p)} %</span>
        <span style={{ color: 'var(--color-fat)' }}>{pct(f)} %</span>
      </div>
    </div>
  )
}

export function NutritionTable({ per100, amount, unit }: { per100: Nutrients; amount: number; unit: string }) {
  const n = scaleNutrients(per100, amount)
  const rows: { label: string; key: keyof Nutrients; unit: string; indent?: boolean }[] = [
    { label: 'Energie', key: 'kcal', unit: 'kcal' },
    { label: 'Fett', key: 'fat', unit: 'g' },
    { label: 'davon gesättigte Fettsäuren', key: 'saturatedFat', unit: 'g', indent: true },
    { label: 'Kohlenhydrate', key: 'carbs', unit: 'g' },
    { label: 'davon Zucker', key: 'sugar', unit: 'g', indent: true },
    { label: 'Ballaststoffe', key: 'fiber', unit: 'g' },
    { label: 'Eiweiß', key: 'protein', unit: 'g' },
    { label: 'Salz', key: 'salt', unit: 'g' },
  ]
  const fmt = (v: number | undefined, u: string) => (v === undefined ? '–' : u === 'kcal' ? `${fmtInt(v)} kcal` : `${fmtGrams(v)} g`)
  return (
    <div className="mt-5">
      <h4 className="mb-2 px-1 text-sm font-semibold text-ink-2">Nährwerte</h4>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 text-xs text-ink-3">
              <th className="px-3 py-2 text-left font-medium" />
              <th className="px-3 py-2 text-right font-medium">Menge ({fmtGrams(amount)} {unit})</th>
              <th className="px-3 py-2 text-right font-medium">100 {unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className={cx('px-3 py-2', r.indent ? 'pl-6 text-ink-3' : 'font-medium text-ink')}>{r.label}</td>
                <td className="px-3 py-2 text-right tnum">{fmt(per100[r.key] === undefined ? undefined : n[r.key], r.unit)}</td>
                <td className="px-3 py-2 text-right text-ink-3 tnum">{fmt(per100[r.key], r.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
