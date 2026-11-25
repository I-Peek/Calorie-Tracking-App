import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, TrendingDown, TrendingUp, Target, Flame } from 'lucide-react'
import { db } from '../db/db'
import type { Profile, WeightEntry } from '../db/types'
import { useGoals, useWeightOn } from '../hooks/data'
import { addDays, dateRange, formatDayMonthShort, formatFullDate, formatWeekdayShort, relativeDayLabel, todayISO } from '../lib/dates'
import { bmi, bmiCategory, estimateGoalDate, sumNutrients } from '../lib/nutrition'
import { fmt1, fmt2, fmtInt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, MacroDot, ProgressBar, SectionTitle, Segmented, cx } from '../components/ui'
import { BarChart, LineChart, type BarDatum } from '../components/charts'
import { WeightSheet } from '../components/WeightSheet'

type WeightRange = '1M' | '3M' | '6M' | '1J' | 'all'
const RANGE_DAYS: Record<WeightRange, number> = { '1M': 30, '3M': 91, '6M': 182, '1J': 365, all: 100000 }

export function ProgressPage({ profile }: { profile: Profile }) {
  const today = todayISO()
  const weightNow = useWeightOn(today, profile) ?? profile.startWeightKg
  const goals = useGoals(profile, weightNow)
  const [range, setRange] = useState<WeightRange>('3M')
  const [days, setDays] = useState<7 | 30>(7)
  const [weightSheet, setWeightSheet] = useState<{ date?: string } | null>(null)

  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), []) ?? []

  const from = addDays(today, -(days - 1))
  const entries = useLiveQuery(() => db.entries.where('date').between(from, today, true, true).toArray(), [from, today]) ?? []
  const water = useLiveQuery(() => db.water.where('date').between(from, today, true, true).toArray(), [from, today]) ?? []
  const activities = useLiveQuery(() => db.activities.where('date').between(from, today, true, true).toArray(), [from, today]) ?? []
  const loggedDates = (useLiveQuery(() => db.entries.orderBy('date').uniqueKeys(), []) as string[] | undefined) ?? []

  // ---------- weight ----------
  const weightPoints = useMemo(() => {
    const cutoff = addDays(today, -RANGE_DAYS[range])
    const list = weights.filter((w) => w.date >= cutoff)
    return list.map((w) => ({ date: w.date, value: w.kg }))
  }, [weights, range, today])

  const startKg = weights[0]?.kg ?? profile.startWeightKg
  const change = weightNow - profile.startWeightKg
  const totalToGo = profile.startWeightKg - profile.goalWeightKg
  const progress = profile.goal === 'maintain' || Math.abs(totalToGo) < 0.1 ? 1 : Math.max(0, Math.min(1, (profile.startWeightKg - weightNow) / totalToGo))
  const bmiValue = bmi(weightNow, profile.heightCm)
  const bmiCat = bmiCategory(bmiValue)
  const goalDate = profile.goal !== 'maintain' ? estimateGoalDate(weightNow, profile.goalWeightKg, profile.weeklyRateKg) : undefined

  // ---------- nutrition ----------
  const dates = dateRange(from, today)
  const byDate = useMemo(() => {
    const m = new Map<string, typeof entries>()
    for (const e of entries) {
      const l = m.get(e.date) ?? []
      l.push(e)
      m.set(e.date, l)
    }
    return m
  }, [entries])

  const kcalData: BarDatum[] = dates.map((d) => ({
    key: d,
    label: days === 7 ? formatWeekdayShort(d) : formatDayMonthShort(d).replace(/\.\s.*/, '.'),
    value: Math.round(sumNutrients((byDate.get(d) ?? []).map((e) => e.nutrients)).kcal),
    highlight: d === today,
  }))
  const burnedByDate = new Map<string, number>()
  for (const a of activities) burnedByDate.set(a.date, (burnedByDate.get(a.date) ?? 0) + a.kcal)

  const loggedDays = dates.filter((d) => (byDate.get(d)?.length ?? 0) > 0)
  const totals = sumNutrients(loggedDays.flatMap((d) => byDate.get(d)!.map((e) => e.nutrients)))
  const n = Math.max(1, loggedDays.length)
  const avg = { kcal: totals.kcal / n, carbs: totals.carbs / n, protein: totals.protein / n, fat: totals.fat / n }
  const goalKcal = goals?.kcal ?? 2000
  const onTarget = loggedDays.filter((d) => {
    const v = kcalData.find((x) => x.key === d)!.value
    const budget = goalKcal + (profile.addExerciseCalories ? (burnedByDate.get(d) ?? 0) : 0)
    return v <= budget * 1.05 && v >= budget * 0.8
  }).length

  const waterByDate = new Map(water.map((w) => [w.date, w.ml]))
  const waterData: BarDatum[] = dates.map((d) => ({
    key: d,
    label: days === 7 ? formatWeekdayShort(d) : formatDayMonthShort(d).replace(/\.\s.*/, '.'),
    value: waterByDate.get(d) ?? 0,
    highlight: d === today,
  }))
  const waterAvg = dates.reduce((a, d) => a + (waterByDate.get(d) ?? 0), 0) / dates.length

  const macroKcal = avg.carbs * 4 + avg.protein * 4 + avg.fat * 9 || 1

  return (
    <div>
      <PageHeader title="Fortschritt" large />

      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Flame className="size-4" />} label="Tage getrackt" value={fmtInt(loggedDates.length)} tone="burn" />
        <MiniStat icon={change <= 0 ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />} label="Veränderung" value={`${change > 0 ? '+' : ''}${fmt1(change)} kg`} tone="protein" />
        <MiniStat icon={<Target className="size-4" />} label="Ziel" value={`${fmt1(profile.goalWeightKg)} kg`} tone="brand" />
      </div>

      {/* Weight */}
      <SectionTitle
        action={
          <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setWeightSheet({})}>
            Eintragen
          </Button>
        }
      >
        Gewicht
      </SectionTitle>
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-ink-3">Aktuell</div>
            <div className="text-4xl font-extrabold tracking-tight tnum">
              {fmt1(weightNow)} <span className="text-lg font-semibold text-ink-3">kg</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cx(
                'inline-block rounded-full px-2.5 py-1 text-xs font-bold',
                bmiCat.tone === 'ok' ? 'bg-brand-soft text-brand-strong dark:text-brand' : bmiCat.tone === 'low' ? 'bg-water/15 text-water' : 'bg-burn/15 text-burn',
              )}
            >
              BMI {fmt1(bmiValue)} · {bmiCat.label}
            </span>
          </div>
        </div>
        {profile.goal !== 'maintain' && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-ink-3 tnum">
              <span>Start {fmt1(profile.startWeightKg)} kg</span>
              <span className="font-semibold text-ink-2">{fmtInt(progress * 100)} %</span>
              <span>Ziel {fmt1(profile.goalWeightKg)} kg</span>
            </div>
            <ProgressBar value={progress} max={1} height={10} />
            {goalDate && <p className="mt-2 text-xs text-ink-3">Bei {fmt2(profile.weeklyRateKg)} kg pro Woche erreichst du dein Ziel voraussichtlich am {formatFullDate(goalDate)}.</p>}
          </div>
        )}
        <Segmented
          className="mt-4"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: '1M', label: '1 M' },
            { value: '3M', label: '3 M' },
            { value: '6M', label: '6 M' },
            { value: '1J', label: '1 J' },
            { value: 'all', label: 'Alle' },
          ]}
        />
        <div className="mt-3">
          {weightPoints.length > 0 ? (
            <LineChart points={weightPoints} goal={profile.goal !== 'maintain' ? profile.goalWeightKg : undefined} color="var(--color-protein)" />
          ) : (
            <p className="py-10 text-center text-sm text-ink-3">Noch keine Einträge in diesem Zeitraum.</p>
          )}
        </div>
        {weights.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {[...weights]
              .reverse()
              .slice(0, 6)
              .map((w: WeightEntry, i, arr) => {
                const prev = arr[i + 1]
                const d = prev ? w.kg - prev.kg : w.kg - startKg
                return (
                  <li key={w.date}>
                    <button type="button" className="flex w-full items-center py-2.5 text-left text-sm" onClick={() => setWeightSheet({ date: w.date })}>
                      <span className="flex-1 text-ink-2">{relativeDayLabel(w.date)}</span>
                      {prev && <span className={cx('mr-3 text-xs font-semibold tnum', d < 0 ? 'text-brand' : d > 0 ? 'text-burn' : 'text-ink-3')}>{d > 0 ? '+' : ''}{fmt1(d)}</span>}
                      <span className="font-semibold tnum">{fmt1(w.kg)} kg</span>
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </Card>

      {/* Nutrition */}
      <SectionTitle
        action={
          <Segmented
            size="sm"
            className="w-36"
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: '7 Tage' },
              { value: 30, label: '30 Tage' },
            ]}
          />
        }
      >
        Ernährung
      </SectionTitle>
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-ink-3">Ø Kalorien</div>
            <div className="text-3xl font-extrabold tnum">
              {fmtInt(avg.kcal)} <span className="text-base font-semibold text-ink-3">kcal</span>
            </div>
          </div>
          <div className="text-right text-sm text-ink-3">
            <div>
              Ziel <span className="font-semibold text-ink tnum">{fmtInt(goalKcal)}</span>
            </div>
            <div>
              Im Zielbereich <span className="font-semibold text-ink tnum">{onTarget}/{loggedDays.length}</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <BarChart
            data={kcalData}
            goal={goalKcal}
            unit="kcal"
            colorFor={(d) => (d.value > goalKcal * 1.1 ? 'var(--color-burn)' : 'var(--color-brand)')}
          />
        </div>
      </Card>

      <Card className="mt-3">
        <div className="mb-3 text-sm font-semibold text-ink-2">Ø Makronährstoffe pro Tag</div>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
          <div style={{ width: `${((avg.carbs * 4) / macroKcal) * 100}%`, background: 'var(--color-carbs)' }} />
          <div style={{ width: `${((avg.protein * 4) / macroKcal) * 100}%`, background: 'var(--color-protein)' }} />
          <div style={{ width: `${((avg.fat * 9) / macroKcal) * 100}%`, background: 'var(--color-fat)' }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(
            [
              ['Kohlenhydrate', avg.carbs, goals?.macros.carbs ?? 0, 'var(--color-carbs)', 4, profile.macros.carbs],
              ['Eiweiß', avg.protein, goals?.macros.protein ?? 0, 'var(--color-protein)', 4, profile.macros.protein],
              ['Fett', avg.fat, goals?.macros.fat ?? 0, 'var(--color-fat)', 9, profile.macros.fat],
            ] as const
          ).map(([label, v, g, color, f, targetPct]) => (
            <div key={label}>
              <div className="flex items-center gap-1.5 text-xs text-ink-3">
                <MacroDot color={color} />
                {label}
              </div>
              <div className="mt-0.5 text-lg font-bold tnum">{fmtInt(v)} g</div>
              <div className="text-xs text-ink-3 tnum">
                {fmtInt(((v * f) / macroKcal) * 100)} % · Ziel {fmtInt(g)} g ({targetPct} %)
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Wasser</SectionTitle>
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-ink-3">Ø pro Tag</div>
            <div className="text-3xl font-extrabold tnum">
              {fmt1(waterAvg / 1000)} <span className="text-base font-semibold text-ink-3">l</span>
            </div>
          </div>
          <div className="text-sm text-ink-3">
            Ziel <span className="font-semibold text-ink tnum">{fmt1(profile.waterGoalMl / 1000)} l</span>
          </div>
        </div>
        <div className="mt-4">
          <BarChart data={waterData} goal={profile.waterGoalMl} unit="ml" color="var(--color-water)" />
        </div>
      </Card>

      <WeightSheet open={weightSheet !== null} onClose={() => setWeightSheet(null)} date={weightSheet?.date} defaultKg={weightNow} />
    </div>
  )
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'burn' | 'protein' | 'brand' }) {
  const color = { burn: 'var(--color-burn)', protein: 'var(--color-protein)', brand: 'var(--color-brand)' }[tone]
  return (
    <Card className="p-3">
      <span className="flex size-7 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
        {icon}
      </span>
      <div className="mt-2 truncate text-lg font-extrabold tnum">{value}</div>
      <div className="truncate text-xs text-ink-3">{label}</div>
    </Card>
  )
}
