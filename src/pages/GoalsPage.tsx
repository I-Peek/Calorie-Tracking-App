import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { GoalType, MacroSplit, Profile, Sex } from '../db/types'
import { saveProfile } from '../db/repo'
import { useWeightOn } from '../hooks/data'
import { todayISO } from '../lib/dates'
import { ACTIVITY_LEVELS, DEFAULT_MACROS, GOAL_LABELS, calculateCalorieGoal, macroGoals, recommendedWaterMl } from '../lib/nutrition'
import { fmt1, fmt2, fmtInt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Field, NumberInput, SectionTitle, Segmented, TextInput, Toggle, cx } from '../components/ui'
import { useToast } from '../components/ui/Toast'

export const MACRO_PRESETS: { label: string; split: MacroSplit }[] = [
  { label: 'Ausgewogen', split: { carbs: 50, protein: 20, fat: 30 } },
  { label: 'High Protein', split: { carbs: 40, protein: 30, fat: 30 } },
  { label: 'Low Carb', split: { carbs: 25, protein: 35, fat: 40 } },
  { label: 'Keto', split: { carbs: 5, protein: 25, fat: 70 } },
]

export const RATE_OPTIONS: Record<Exclude<GoalType, 'maintain'>, number[]> = {
  lose: [0.25, 0.5, 0.75, 1],
  gain: [0.25, 0.5],
}

export function GoalsPage({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const currentWeight = useWeightOn(todayISO(), profile) ?? profile.startWeightKg
  const [p, setP] = useState<Profile>(profile)
  const [manual, setManual] = useState(!!profile.calorieGoalOverride)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }))

  const calc = calculateCalorieGoal(p, currentWeight)
  const kcal = manual && p.calorieGoalOverride ? p.calorieGoalOverride : calc.goal
  const macroSum = p.macros.carbs + p.macros.protein + p.macros.fat
  const mg = macroGoals(kcal, p.macros)
  const age = new Date().getFullYear() - p.birthYear
  const valid =
    macroSum === 100 &&
    p.heightCm >= 100 && p.heightCm <= 250 &&
    p.startWeightKg >= 30 && p.startWeightKg <= 350 &&
    p.goalWeightKg >= 30 && p.goalWeightKg <= 350 &&
    age >= 14 && age <= 110 &&
    p.waterGoalMl >= 500 && p.glassSizeMl >= 50 &&
    (!manual || (p.calorieGoalOverride ?? 0) >= 800)

  const setGoal = (g: GoalType) => {
    setP((x) => ({
      ...x,
      goal: g,
      weeklyRateKg: g === 'maintain' ? 0 : x.weeklyRateKg > 0 && RATE_OPTIONS[g].includes(x.weeklyRateKg) ? x.weeklyRateKg : 0.5,
      goalWeightKg: g === 'maintain' ? currentWeight : x.goalWeightKg,
    }))
  }

  const save = async () => {
    if (!valid) return
    await saveProfile({ ...p, calorieGoalOverride: manual ? p.calorieGoalOverride : undefined })
    toast.show('Ziele gespeichert')
    navigate(-1)
  }

  return (
    <div className="pb-6">
      <PageHeader back title="Ziele & persönliche Daten" />

      <SectionTitle>Dein Ziel</SectionTitle>
      <Card className="space-y-4">
        <Segmented
          value={p.goal}
          onChange={setGoal}
          options={(['lose', 'maintain', 'gain'] as GoalType[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
        />
        {p.goal !== 'maintain' && (
          <>
            <Field label="Zielgewicht">
              <NumberInput value={p.goalWeightKg} onChange={(v) => set('goalWeightKg', v ?? 0)} suffix="kg" />
            </Field>
            <Field label="Tempo pro Woche">
              <div className="grid grid-cols-4 gap-2">
                {RATE_OPTIONS[p.goal].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('weeklyRateKg', r)}
                    className={cx('h-11 rounded-2xl border text-sm font-bold tnum', p.weeklyRateKg === r ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2')}
                  >
                    {fmt2(r)} kg
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}
      </Card>

      <SectionTitle>Kalorienziel</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-extrabold tracking-tight tnum">{fmtInt(kcal)}</span>
          <span className="text-sm text-ink-3">kcal pro Tag</span>
        </div>
        {!manual && (
          <div className="mt-3 space-y-1 rounded-2xl bg-surface-2 p-3 text-sm text-ink-2 tnum">
            <Row label="Grundumsatz" value={`${fmtInt(calc.bmr)} kcal`} />
            <Row label="Gesamtumsatz (ohne Sport)" value={`${fmtInt(calc.tdee)} kcal`} />
            {p.goal !== 'maintain' && <Row label={p.goal === 'lose' ? 'Defizit' : 'Überschuss'} value={`${p.goal === 'lose' ? '−' : '+'}${fmtInt(Math.abs(calc.raw - calc.tdee))} kcal`} />}
            {calc.clamped && <p className="pt-1 text-xs text-burn">Aus Sicherheitsgründen nicht unter {fmtInt(calc.goal)} kcal. Wähle ein langsameres Tempo für ein gesünderes Defizit.</p>}
          </div>
        )}
        <Toggle checked={manual} onChange={(v) => { setManual(v); if (v && !p.calorieGoalOverride) set('calorieGoalOverride', calc.goal) }} label="Eigenes Kalorienziel" description="Statt der automatischen Berechnung" />
        {manual && <NumberInput value={p.calorieGoalOverride} onChange={(v) => set('calorieGoalOverride', v)} suffix="kcal" decimals={0} />}
        <div className="mt-2 border-t border-line pt-1">
          <Toggle
            checked={p.addExerciseCalories}
            onChange={(v) => set('addExerciseCalories', v)}
            label="Verbrannte Kalorien gutschreiben"
            description="Aktivitäten erhöhen dein Tagesbudget"
          />
        </div>
      </Card>

      <SectionTitle>Makronährstoffe</SectionTitle>
      <Card className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {MACRO_PRESETS.map((m) => {
            const active = m.split.carbs === p.macros.carbs && m.split.protein === p.macros.protein && m.split.fat === p.macros.fat
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => set('macros', m.split)}
                className={cx('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', active ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2')}
              >
                {m.label}
              </button>
            )
          })}
        </div>
        <MacroSlider label="Kohlenhydrate" color="var(--color-carbs)" value={p.macros.carbs} grams={mg.carbs} onChange={(v) => set('macros', { ...p.macros, carbs: v })} />
        <MacroSlider label="Eiweiß" color="var(--color-protein)" value={p.macros.protein} grams={mg.protein} onChange={(v) => set('macros', { ...p.macros, protein: v })} />
        <MacroSlider label="Fett" color="var(--color-fat)" value={p.macros.fat} grams={mg.fat} onChange={(v) => set('macros', { ...p.macros, fat: v })} />
        <p className={cx('text-sm font-semibold', macroSum === 100 ? 'text-brand' : 'text-danger')}>
          Summe: {macroSum} % {macroSum !== 100 && '– muss 100 % ergeben'}
        </p>
        <p className="text-xs text-ink-3">Eiweiß: {fmt1(mg.protein / currentWeight)} g pro kg Körpergewicht</p>
      </Card>

      <SectionTitle>Wasser & Schritte</SectionTitle>
      <Card className="space-y-4">
        <Field
          label="Wasserziel pro Tag"
          hint={
            <button type="button" className="font-semibold text-brand" onClick={() => set('waterGoalMl', recommendedWaterMl(currentWeight))}>
              Empfehlung übernehmen ({fmt1(recommendedWaterMl(currentWeight) / 1000)} l)
            </button>
          }
        >
          <NumberInput value={p.waterGoalMl} onChange={(v) => set('waterGoalMl', v ?? 0)} suffix="ml" decimals={0} />
        </Field>
        <Field label="Glasgröße">
          <Segmented
            value={p.glassSizeMl}
            onChange={(v) => set('glassSizeMl', v)}
            options={[200, 250, 330, 500].map((v) => ({ value: v, label: `${v} ml` }))}
          />
        </Field>
        <Field label="Schritteziel">
          <NumberInput value={p.stepsGoal} onChange={(v) => set('stepsGoal', v ?? 0)} suffix="Schritte" decimals={0} className="[&_input]:pr-24" />
        </Field>
      </Card>

      <SectionTitle>Persönliche Daten</SectionTitle>
      <Card className="space-y-4">
        <Field label="Name (optional)">
          <TextInput value={p.name ?? ''} onChange={(e) => set('name', e.target.value || undefined)} maxLength={40} />
        </Field>
        <Field label="Geschlecht">
          <Segmented<Sex> value={p.sex} onChange={(v) => set('sex', v)} options={[{ value: 'female', label: 'Weiblich' }, { value: 'male', label: 'Männlich' }]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Geburtsjahr" hint={`${age} Jahre`}>
            <NumberInput value={p.birthYear} onChange={(v) => set('birthYear', v ?? 0)} decimals={0} />
          </Field>
          <Field label="Größe">
            <NumberInput value={p.heightCm} onChange={(v) => set('heightCm', v ?? 0)} suffix="cm" decimals={0} />
          </Field>
        </div>
        <Field label="Startgewicht" hint="Dein aktuelles Gewicht trägst du unter „Fortschritt“ ein.">
          <NumberInput value={p.startWeightKg} onChange={(v) => set('startWeightKg', v ?? 0)} suffix="kg" />
        </Field>
        <Field label="Aktivität im Alltag (ohne Sport)">
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => set('activityLevel', l.value)}
                className={cx('w-full rounded-2xl border p-3 text-left', p.activityLevel === l.value ? 'border-brand bg-brand-soft' : 'border-line')}
              >
                <div className="font-semibold">{l.label}</div>
                <div className="text-sm text-ink-3">{l.description}</div>
              </button>
            ))}
          </div>
        </Field>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => set('macros', DEFAULT_MACROS[p.goal])}
        >
          Makros auf Standard für „{GOAL_LABELS[p.goal]}“ zurücksetzen
        </Button>
      </Card>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-page/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <Button size="lg" block disabled={!valid} onClick={save}>
          Speichern
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

function MacroSlider({ label, color, value, grams, onChange }: { label: string; color: string; value: number; grams: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-ink-3 tnum">
          <span className="font-bold text-ink">{value} %</span> · {fmtInt(grams)} g
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={80}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-3"
        style={{ accentColor: color }}
        aria-label={label}
      />
    </div>
  )
}
