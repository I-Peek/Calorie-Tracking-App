import { useEffect, useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Button, Field, NumberInput, TextInput, cx } from './ui'
import type { DiaryEntry, MealType } from '../db/types'
import { MEALS } from '../hooks/data'
import { kcalFromMacros } from '../lib/nutrition'
import { fmtInt } from '../lib/format'

export interface QuickAddValues {
  name: string
  meal: MealType
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** Enter calories (and optionally macros) without a food. */
export function QuickAddSheet({
  open,
  onClose,
  meal,
  entry,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  meal: MealType
  entry?: DiaryEntry
  onSave: (v: QuickAddValues) => void | Promise<void>
  onDelete?: () => void
}) {
  const [name, setName] = useState('')
  const [m, setM] = useState<MealType>(meal)
  const [kcal, setKcal] = useState<number | undefined>()
  const [protein, setProtein] = useState<number | undefined>()
  const [carbs, setCarbs] = useState<number | undefined>()
  const [fat, setFat] = useState<number | undefined>()

  useEffect(() => {
    if (!open) return
    setName(entry?.name ?? '')
    setM(entry?.meal ?? meal)
    setKcal(entry ? Math.round(entry.nutrients.kcal) : undefined)
    setProtein(entry?.nutrients.protein || undefined)
    setCarbs(entry?.nutrients.carbs || undefined)
    setFat(entry?.nutrients.fat || undefined)
  }, [open, entry, meal])

  const macroKcal = kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0)
  const effectiveKcal = kcal ?? (macroKcal > 0 ? Math.round(macroKcal) : undefined)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Schnelleintrag bearbeiten' : 'Kalorien schnell eintragen'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete}>
              Löschen
            </Button>
          )}
          <Button
            size="lg"
            block
            disabled={!effectiveKcal || effectiveKcal <= 0}
            onClick={() => onSave({ name, meal: m, kcal: effectiveKcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 })}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Bezeichnung (optional)">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Kantinenessen" maxLength={80} />
        </Field>
        <Field label="Kalorien" hint={kcal === undefined && macroKcal > 0 ? `Aus Makros berechnet: ${fmtInt(macroKcal)} kcal` : undefined}>
          <NumberInput value={kcal} onChange={setKcal} suffix="kcal" decimals={0} placeholder="0" />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Kohlenh.">
            <NumberInput value={carbs} onChange={setCarbs} suffix="g" placeholder="0" />
          </Field>
          <Field label="Eiweiß">
            <NumberInput value={protein} onChange={setProtein} suffix="g" placeholder="0" />
          </Field>
          <Field label="Fett">
            <NumberInput value={fat} onChange={setFat} suffix="g" placeholder="0" />
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setM(x.key)}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-2xl border py-2 text-xs font-semibold transition',
                m === x.key ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2',
              )}
            >
              <span className="text-lg">{x.emoji}</span>
              {x.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
