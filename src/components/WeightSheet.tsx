import { useEffect, useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Button, Field, NumberInput } from './ui'
import { saveWeight, deleteWeight } from '../db/repo'
import { todayISO, isValidISODate } from '../lib/dates'
import { db } from '../db/db'
import { useToast } from './ui/Toast'

export function WeightSheet({ open, onClose, date: initialDate, defaultKg }: { open: boolean; onClose: () => void; date?: string; defaultKg?: number }) {
  const [date, setDate] = useState(todayISO())
  const [kg, setKg] = useState<number | undefined>(defaultKg)
  const [bodyFat, setBodyFat] = useState<number | undefined>()
  const [waist, setWaist] = useState<number | undefined>()
  const [exists, setExists] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setDate(initialDate ?? todayISO())
  }, [open, initialDate])

  useEffect(() => {
    if (!open || !isValidISODate(date)) return
    let cancelled = false
    void db.weights.get(date).then((w) => {
      if (cancelled) return
      setExists(!!w)
      setKg(w?.kg ?? defaultKg)
      setBodyFat(w?.bodyFat)
      setWaist(w?.waistCm)
    })
    return () => {
      cancelled = true
    }
  }, [open, date, defaultKg])

  const valid = kg !== undefined && kg >= 20 && kg <= 400 && isValidISODate(date)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Gewicht eintragen"
      footer={
        <div className="flex gap-2">
          {exists && (
            <Button
              variant="danger"
              size="lg"
              onClick={async () => {
                await deleteWeight(date)
                toast.show('Eintrag gelöscht')
                onClose()
              }}
            >
              Löschen
            </Button>
          )}
          <Button
            size="lg"
            block
            disabled={!valid}
            onClick={async () => {
              if (!valid || kg === undefined) return
              await saveWeight({ date, kg, bodyFat, waistCm: waist })
              toast.show('Gewicht gespeichert')
              onClose()
            }}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Gewicht">
          <NumberInput value={kg} onChange={setKg} suffix="kg" decimals={1} autoFocus className="[&_input]:h-16 [&_input]:text-center [&_input]:text-3xl [&_input]:font-bold" />
        </Field>
        <Field label="Datum">
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-ink outline-none focus:border-brand" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Körperfett (optional)">
            <NumberInput value={bodyFat} onChange={setBodyFat} suffix="%" />
          </Field>
          <Field label="Bauchumfang (optional)">
            <NumberInput value={waist} onChange={setWaist} suffix="cm" />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}
