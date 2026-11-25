import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button, Field, NumberInput, TextInput, cx, inputClass } from './ui'
import { ACTIVITIES, CUSTOM_ACTIVITY_KEY, STEPS_KEY, activityByKey, activityEmoji, activityKcal, stepsKcal, type ActivityDef } from '../lib/activities'
import { addActivity, deleteActivity, updateActivity } from '../db/repo'
import type { ActivityEntry } from '../db/types'
import { matchScore } from '../lib/search'
import { fmtInt } from '../lib/format'
import { useToast } from './ui/Toast'

type Selection = { kind: 'activity'; def: ActivityDef } | { kind: 'steps' } | { kind: 'custom' }

export function ActivitySheet({ open, onClose, date, weightKg, entry }: { open: boolean; onClose: () => void; date: string; weightKg: number; entry?: ActivityEntry }) {
  const [sel, setSel] = useState<Selection>()
  const [query, setQuery] = useState('')
  const [minutes, setMinutes] = useState<number | undefined>(30)
  const [steps, setSteps] = useState<number | undefined>()
  const [customName, setCustomName] = useState('')
  const [kcalOverride, setKcalOverride] = useState<number | undefined>()
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setQuery('')
    setKcalOverride(undefined)
    if (entry) {
      if (entry.activityKey === STEPS_KEY) {
        setSel({ kind: 'steps' })
        setSteps(entry.steps)
      } else if (activityByKey(entry.activityKey)) {
        setSel({ kind: 'activity', def: activityByKey(entry.activityKey)! })
        setMinutes(entry.minutes)
        const auto = activityKcal(activityByKey(entry.activityKey)!.met, weightKg, entry.minutes)
        if (auto !== entry.kcal) setKcalOverride(entry.kcal)
      } else {
        setSel({ kind: 'custom' })
        setCustomName(entry.name)
        setMinutes(entry.minutes || undefined)
        setKcalOverride(entry.kcal)
      }
    } else {
      setSel(undefined)
      setMinutes(30)
      setSteps(undefined)
      setCustomName('')
    }
  }, [open, entry, weightKg])

  const filtered = useMemo(() => {
    if (!query.trim()) return ACTIVITIES
    return ACTIVITIES.map((a) => ({ a, s: matchScore(query, a.name) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .map((x) => x.a)
  }, [query])

  const autoKcal =
    sel?.kind === 'activity' ? activityKcal(sel.def.met, weightKg, minutes ?? 0) : sel?.kind === 'steps' ? stepsKcal(steps ?? 0, weightKg) : undefined
  const kcal = kcalOverride ?? autoKcal ?? 0

  const valid =
    (sel?.kind === 'activity' && (minutes ?? 0) > 0) ||
    (sel?.kind === 'steps' && (steps ?? 0) > 0) ||
    (sel?.kind === 'custom' && (kcalOverride ?? 0) > 0)

  const save = async () => {
    if (!sel || !valid) return
    const data: Omit<ActivityEntry, 'id' | 'createdAt'> =
      sel.kind === 'activity'
        ? { date, activityKey: sel.def.key, name: sel.def.name, minutes: minutes ?? 0, kcal }
        : sel.kind === 'steps'
          ? { date, activityKey: STEPS_KEY, name: 'Schritte', minutes: 0, steps: steps ?? 0, kcal }
          : { date, activityKey: CUSTOM_ACTIVITY_KEY, name: customName.trim() || 'Eigene Aktivität', minutes: minutes ?? 0, kcal }
    if (entry?.id) await updateActivity(entry.id, data)
    else await addActivity(data)
    toast.show(entry ? 'Aktivität aktualisiert' : `${fmtInt(kcal)} kcal verbrannt 🔥`)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full={!sel}
      title={sel ? (entry ? 'Aktivität bearbeiten' : 'Aktivität eintragen') : 'Aktivität wählen'}
      footer={
        sel ? (
          <div className="flex gap-2">
            {entry?.id ? (
              <Button
                variant="danger"
                size="lg"
                onClick={async () => {
                  await deleteActivity(entry.id!)
                  toast.show('Aktivität gelöscht')
                  onClose()
                }}
              >
                Löschen
              </Button>
            ) : (
              <Button variant="secondary" size="lg" onClick={() => setSel(undefined)}>
                Zurück
              </Button>
            )}
            <Button size="lg" block disabled={!valid} onClick={save}>
              Speichern
            </Button>
          </div>
        ) : undefined
      }
    >
      {!sel ? (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Aktivität suchen" className={cx(inputClass, 'pl-12')} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSel({ kind: 'steps' })} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left font-semibold hover:bg-surface-3">
              <span className="text-2xl">👣</span>Schritte
            </button>
            <button type="button" onClick={() => setSel({ kind: 'custom' })} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left font-semibold hover:bg-surface-3">
              <span className="text-2xl">⚡</span>Eigene kcal
            </button>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {filtered.map((a) => (
              <li key={a.key}>
                <button type="button" onClick={() => setSel({ kind: 'activity', def: a })} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-2 text-xl">{a.emoji}</span>
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{a.name}</span>
                    <span className="text-sm text-ink-3 tnum">≈ {fmtInt(activityKcal(a.met, weightKg, 30))} kcal / 30 min</span>
                  </span>
                  <ChevronRight className="size-5 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-3xl bg-surface-2 text-3xl">
              {sel.kind === 'activity' ? sel.def.emoji : activityEmoji(sel.kind === 'steps' ? STEPS_KEY : CUSTOM_ACTIVITY_KEY)}
            </span>
            <div>
              <div className="text-lg font-bold">{sel.kind === 'activity' ? sel.def.name : sel.kind === 'steps' ? 'Schritte' : 'Eigene Aktivität'}</div>
              {sel.kind === 'activity' && <div className="text-sm text-ink-3">MET {String(sel.def.met).replace('.', ',')}</div>}
            </div>
          </div>

          {sel.kind === 'custom' && (
            <Field label="Bezeichnung">
              <TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="z. B. Laufen (laut Smartwatch)" />
            </Field>
          )}

          {sel.kind === 'steps' ? (
            <Field label="Schritte" hint="Geschätzter Verbrauch: ca. 100 Schritte pro Minute bei normalem Gehtempo.">
              <NumberInput value={steps} onChange={setSteps} decimals={0} autoFocus suffix="Schritte" className="[&_input]:pr-24" />
            </Field>
          ) : (
            <Field label="Dauer">
              <NumberInput value={minutes} onChange={setMinutes} decimals={0} suffix="min" autoFocus={sel.kind === 'activity'} />
              <div className="mt-2 flex gap-2">
                {[15, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={cx('h-8 flex-1 rounded-full border text-sm font-semibold', minutes === m ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2')}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field
            label="Verbrannte Kalorien"
            hint={sel.kind === 'custom' ? 'z. B. die aktiven Kalorien deiner Smartwatch.' : 'Automatisch berechnet (aktive Kalorien). Du kannst den Wert anpassen.'}
          >
            <NumberInput value={kcalOverride ?? autoKcal} onChange={(v) => setKcalOverride(v)} decimals={0} suffix="kcal" />
          </Field>

          <div className="rounded-3xl bg-burn/10 p-4 text-center">
            <div className="text-4xl font-extrabold text-burn tnum">{fmtInt(kcal)}</div>
            <div className="text-sm font-medium text-ink-2">kcal verbrannt</div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
