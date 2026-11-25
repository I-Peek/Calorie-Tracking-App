import { useState } from 'react'
import { ChevronLeft, ScanBarcode, Droplet, ChartLine, Hourglass, ShieldCheck, Upload } from 'lucide-react'
import type { GoalType, Profile, Sex } from '../db/types'
import { saveProfile, saveWeight } from '../db/repo'
import { todayISO, formatFullDate } from '../lib/dates'
import { ACTIVITY_LEVELS, DEFAULT_MACROS, calculateCalorieGoal, estimateGoalDate, macroGoals, recommendedWaterMl } from '../lib/nutrition'
import { fmt1, fmt2, fmtInt } from '../lib/format'
import { parseBackup, restoreBackup } from '../lib/backup'
import { Button, Field, IconButton, MacroDot, NumberInput, ProgressBar, Segmented, TextInput, cx } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { RATE_OPTIONS } from './GoalsPage'

const STEPS = 6

export function OnboardingPage() {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<GoalType>('lose')
  const [sex, setSex] = useState<Sex>('female')
  const [birthYear, setBirthYear] = useState<number | undefined>()
  const [height, setHeight] = useState<number | undefined>()
  const [weight, setWeight] = useState<number | undefined>()
  const [goalWeight, setGoalWeight] = useState<number | undefined>()
  const [rate, setRate] = useState(0.5)
  const [activity, setActivity] = useState<number>(1.375)
  const [saving, setSaving] = useState(false)

  const year = new Date().getFullYear()
  const age = birthYear ? year - birthYear : 0
  const aboutValid = !!birthYear && age >= 14 && age <= 110 && !!height && height >= 100 && height <= 250
  const goalWeightOk =
    goal === 'maintain' ||
    (!!goalWeight && goalWeight >= 30 && goalWeight <= 350 && (goal === 'lose' ? goalWeight < (weight ?? 0) : goalWeight > (weight ?? 0)))
  const weightValid = !!weight && weight >= 30 && weight <= 350 && goalWeightOk

  const profileDraft: Profile = {
    name: name.trim() || undefined,
    sex,
    birthYear: birthYear ?? year - 30,
    heightCm: height ?? 170,
    startWeightKg: weight ?? 70,
    goalWeightKg: goal === 'maintain' ? (weight ?? 70) : (goalWeight ?? weight ?? 70),
    activityLevel: activity,
    goal,
    weeklyRateKg: goal === 'maintain' ? 0 : rate,
    macros: DEFAULT_MACROS[goal],
    waterGoalMl: recommendedWaterMl(weight ?? 70),
    glassSizeMl: 250,
    stepsGoal: 10000,
    addExerciseCalories: true,
    fastingPlan: '16:8',
    createdAt: Date.now(),
  }
  const result = calculateCalorieGoal(profileDraft, profileDraft.startWeightKg)
  const macros = macroGoals(result.goal, profileDraft.macros)
  const goalDate = goal !== 'maintain' ? estimateGoalDate(profileDraft.startWeightKg, profileDraft.goalWeightKg, rate) : undefined

  const finish = async () => {
    setSaving(true)
    await saveWeight({ date: todayISO(), kg: profileDraft.startWeightKg })
    await saveProfile({ ...profileDraft, createdAt: Date.now() })
  }

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const importBackup = async (file: File) => {
    try {
      await restoreBackup(parseBackup(await file.text()))
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Import fehlgeschlagen', { tone: 'error' })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {step > 0 && (
        <div className="flex items-center gap-2">
          <IconButton label="Zurück" onClick={back} className="-ml-2">
            <ChevronLeft className="size-6" />
          </IconButton>
          <ProgressBar value={step} max={STEPS - 1} height={6} className="flex-1" />
          <span className="w-10 text-right text-xs text-ink-3 tnum">
            {step}/{STEPS - 1}
          </span>
        </div>
      )}

      <div className="flex-1 py-6">
        {step === 0 && (
          <div className="flex h-full flex-col">
            <div className="mt-6 flex flex-col items-center text-center">
              <img src="./icons/favicon.svg" alt="" className="size-20 drop-shadow-lg" />
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Willkommen bei NutriLog</h1>
              <p className="mt-2 max-w-sm text-ink-2">Dein persönlicher Kalorientracker – kostenlos, ohne Werbung und deine Daten bleiben auf deinem Gerät.</p>
            </div>
            <ul className="mt-8 space-y-3">
              <Feature icon={<ScanBarcode className="size-5" />} title="Barcode-Scanner" text="Millionen Produkte aus Open Food Facts" />
              <Feature icon={<ChartLine className="size-5" />} title="Kalorien & Makros" text="Kohlenhydrate, Eiweiß, Fett und mehr" />
              <Feature icon={<Droplet className="size-5" />} title="Wasser & Aktivitäten" text="Trinken, Sport und Schritte im Blick" />
              <Feature icon={<Hourglass className="size-5" />} title="Intervallfasten" text="16:8, 18:6 und weitere Pläne" />
              <Feature icon={<ShieldCheck className="size-5" />} title="Privat" text="Keine Anmeldung, keine Cloud" />
            </ul>
          </div>
        )}

        {step === 1 && (
          <StepTitle title="Was ist dein Ziel?" sub="Danach berechnen wir deinen Kalorienbedarf.">
            <div className="space-y-3">
              {(
                [
                  ['lose', '📉', 'Abnehmen', 'Gesund Gewicht verlieren'],
                  ['maintain', '⚖️', 'Gewicht halten', 'Bewusster essen und in Form bleiben'],
                  ['gain', '💪', 'Zunehmen', 'Muskeln oder Gewicht aufbauen'],
                ] as const
              ).map(([g, emoji, title, text]) => (
                <ChoiceCard key={g} active={goal === g} onClick={() => setGoal(g)} emoji={emoji} title={title} text={text} />
              ))}
            </div>
          </StepTitle>
        )}

        {step === 2 && (
          <StepTitle title="Erzähl uns von dir" sub="Für die Berechnung deines Grundumsatzes.">
            <div className="space-y-4">
              <Field label="Vorname (optional)">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Wie dürfen wir dich nennen?" />
              </Field>
              <Field label="Geschlecht">
                <Segmented<Sex> value={sex} onChange={setSex} options={[{ value: 'female', label: 'Weiblich' }, { value: 'male', label: 'Männlich' }]} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Geburtsjahr" hint={birthYear && age > 0 ? `${age} Jahre` : undefined}>
                  <NumberInput value={birthYear} onChange={setBirthYear} decimals={0} placeholder={String(year - 30)} />
                </Field>
                <Field label="Größe">
                  <NumberInput value={height} onChange={setHeight} decimals={0} suffix="cm" placeholder="170" />
                </Field>
              </div>
            </div>
          </StepTitle>
        )}

        {step === 3 && (
          <StepTitle title="Dein Gewicht" sub={goal === 'maintain' ? 'Wie viel wiegst du aktuell?' : 'Wo stehst du und wo willst du hin?'}>
            <div className="space-y-4">
              <Field label="Aktuelles Gewicht">
                <NumberInput value={weight} onChange={setWeight} suffix="kg" placeholder="75" />
              </Field>
              {goal !== 'maintain' && (
                <>
                  <Field
                    label="Zielgewicht"
                    hint={
                      goalWeight && weight && !goalWeightOk
                        ? goal === 'lose'
                          ? 'Das Zielgewicht sollte unter deinem aktuellen Gewicht liegen.'
                          : 'Das Zielgewicht sollte über deinem aktuellen Gewicht liegen.'
                        : undefined
                    }
                  >
                    <NumberInput value={goalWeight} onChange={setGoalWeight} suffix="kg" placeholder={goal === 'lose' ? '68' : '80'} />
                  </Field>
                  <Field label="Wie schnell?" hint={goal === 'lose' ? '0,5 kg pro Woche gilt als gesundes, nachhaltiges Tempo.' : '0,25 kg pro Woche minimiert Fettzunahme.'}>
                    <div className="grid grid-cols-4 gap-2">
                      {RATE_OPTIONS[goal].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRate(r)}
                          className={cx('h-12 rounded-2xl border text-sm font-bold tnum', rate === r ? 'border-brand bg-brand-soft text-brand-strong dark:text-brand' : 'border-line text-ink-2')}
                        >
                          {fmt2(r)} kg
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}
            </div>
          </StepTitle>
        )}

        {step === 4 && (
          <StepTitle title="Wie aktiv ist dein Alltag?" sub="Sport trägst du später separat ein – hier geht es um Beruf und Alltag.">
            <div className="space-y-3">
              {ACTIVITY_LEVELS.map((l, i) => (
                <ChoiceCard key={l.value} active={activity === l.value} onClick={() => setActivity(l.value)} emoji={['🪑', '🚶', '🧍', '🏗️'][i]} title={l.label} text={l.description} />
              ))}
            </div>
          </StepTitle>
        )}

        {step === 5 && (
          <StepTitle title={name.trim() ? `Dein Plan, ${name.trim()}` : 'Dein persönlicher Plan'} sub="Du kannst alles jederzeit im Profil anpassen.">
            <div className="rounded-3xl bg-surface p-6 text-center shadow-card">
              <div className="text-sm font-semibold uppercase tracking-wide text-ink-3">Tägliches Kalorienziel</div>
              <div className="mt-1 text-6xl font-extrabold tracking-tight text-brand tnum">{fmtInt(result.goal)}</div>
              <div className="text-ink-3">kcal</div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-left">
                <MacroBox label="Kohlenh." value={macros.carbs} color="var(--color-carbs)" />
                <MacroBox label="Eiweiß" value={macros.protein} color="var(--color-protein)" />
                <MacroBox label="Fett" value={macros.fat} color="var(--color-fat)" />
              </div>
            </div>
            <div className="mt-3 space-y-2 rounded-3xl bg-surface p-4 text-sm shadow-card tnum">
              <Line label="Grundumsatz" value={`${fmtInt(result.bmr)} kcal`} />
              <Line label="Gesamtumsatz im Alltag" value={`${fmtInt(result.tdee)} kcal`} />
              <Line label="Wasser pro Tag" value={`${fmt1(profileDraft.waterGoalMl / 1000)} l`} />
              {goalDate && <Line label="Ziel erreicht ca." value={formatFullDate(goalDate)} />}
              {result.clamped && <p className="text-xs text-burn">Hinweis: Dein Ziel wurde auf ein sicheres Minimum angehoben. Ein langsameres Tempo ist nachhaltiger.</p>}
            </div>
          </StepTitle>
        )}
      </div>

      <div className="space-y-2">
        {step === 0 && (
          <>
            <Button size="lg" block onClick={next}>
              Los geht's
            </Button>
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-ink-2">
              <Upload className="size-4" />
              Sicherung wiederherstellen
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importBackup(f)
                  e.target.value = ''
                }}
              />
            </label>
          </>
        )}
        {step > 0 && step < 5 && (
          <Button size="lg" block onClick={next} disabled={(step === 2 && !aboutValid) || (step === 3 && !weightValid)}>
            Weiter
          </Button>
        )}
        {step === 5 && (
          <Button size="lg" block onClick={finish} loading={saving}>
            Jetzt starten
          </Button>
        )}
      </div>
    </div>
  )
}

function StepTitle({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-ink-2">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function ChoiceCard({ active, onClick, emoji, title, text }: { active: boolean; onClick: () => void; emoji: string; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('flex w-full items-center gap-4 rounded-3xl border-2 bg-surface p-4 text-left shadow-card transition', active ? 'border-brand' : 'border-transparent')}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{emoji}</span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-ink-3">{text}</span>
      </span>
      <span className={cx('flex size-6 items-center justify-center rounded-full border-2', active ? 'border-brand bg-brand' : 'border-line')}>
        {active && <span className="size-2 rounded-full bg-white" />}
      </span>
    </button>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-3">{text}</span>
      </span>
    </li>
  )
}

function MacroBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        <MacroDot color={color} />
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tnum">{fmtInt(value)} g</div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
