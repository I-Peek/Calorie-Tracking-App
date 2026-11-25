import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db/db'
import type { ActivityEntry, DiaryEntry, MealType, Nutrients, Profile } from '../db/types'
import { calorieGoal, macroGoals, sumNutrients, type MacroGoals } from '../lib/nutrition'

export const MEALS: { key: MealType; label: string; emoji: string; share: number }[] = [
  { key: 'breakfast', label: 'Frühstück', emoji: '☕', share: 0.25 },
  { key: 'lunch', label: 'Mittagessen', emoji: '🥗', share: 0.35 },
  { key: 'dinner', label: 'Abendessen', emoji: '🍝', share: 0.3 },
  { key: 'snack', label: 'Snacks', emoji: '🍎', share: 0.1 },
]

export function mealLabel(m: MealType): string {
  return MEALS.find((x) => x.key === m)?.label ?? m
}

/** Profile: `undefined` while loading, `null` if not set up yet. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('profile')
    return (row?.value as Profile | undefined) ?? null
  }, [])
}

/** Most recent weight on or before `date`, falling back to the profile's start weight. */
export function useWeightOn(date: string, profile: Profile | null | undefined): number | undefined {
  const w = useLiveQuery(() => db.weights.where('date').belowOrEqual(date).last(), [date])
  if (w) return w.kg
  return profile?.startWeightKg
}

export interface Goals {
  kcal: number
  macros: MacroGoals
  waterMl: number
}

export function useGoals(profile: Profile | null | undefined, weightKg: number | undefined): Goals | undefined {
  return useMemo(() => {
    if (!profile) return undefined
    const kcal = calorieGoal(profile, weightKg ?? profile.startWeightKg)
    return { kcal, macros: macroGoals(kcal, profile.macros), waterMl: profile.waterGoalMl }
  }, [profile, weightKg])
}

export interface DayData {
  entries: DiaryEntry[]
  byMeal: Record<MealType, DiaryEntry[]>
  mealTotals: Record<MealType, Nutrients>
  totals: Nutrients
  waterMl: number
  activities: ActivityEntry[]
  burned: number
}

export function useDay(date: string): DayData | undefined {
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).sortBy('createdAt'), [date])
  const water = useLiveQuery(() => db.water.get(date), [date])
  const activities = useLiveQuery(() => db.activities.where('date').equals(date).sortBy('createdAt'), [date])

  return useMemo(() => {
    if (!entries || !activities) return undefined
    const byMeal = { breakfast: [], lunch: [], dinner: [], snack: [] } as Record<MealType, DiaryEntry[]>
    for (const e of entries) byMeal[e.meal].push(e)
    const mealTotals = {} as Record<MealType, Nutrients>
    for (const m of MEALS) mealTotals[m.key] = sumNutrients(byMeal[m.key].map((e) => e.nutrients))
    return {
      entries,
      byMeal,
      mealTotals,
      totals: sumNutrients(entries.map((e) => e.nutrients)),
      waterMl: water?.ml ?? 0,
      activities,
      burned: activities.reduce((a, x) => a + x.kcal, 0),
    }
  }, [entries, water, activities])
}
