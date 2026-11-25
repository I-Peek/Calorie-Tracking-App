import type { GoalType, MacroSplit, Nutrients, Profile, Serving, Sex } from '../db/types'

export const KCAL_PER_KG_FAT = 7700

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Wenig aktiv', description: 'Überwiegend sitzend, z. B. Büro, kaum Bewegung im Alltag' },
  { value: 1.375, label: 'Leicht aktiv', description: 'Sitzend mit etwas Bewegung, z. B. Spaziergänge, Hausarbeit' },
  { value: 1.55, label: 'Aktiv', description: 'Viel auf den Beinen, z. B. Verkauf, Pflege, Kellnern' },
  { value: 1.725, label: 'Sehr aktiv', description: 'Körperlich anstrengende Arbeit, z. B. Bau, Handwerk' },
] as const

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: 'Abnehmen',
  maintain: 'Gewicht halten',
  gain: 'Zunehmen',
}

export const DEFAULT_MACROS: Record<GoalType, MacroSplit> = {
  lose: { carbs: 40, protein: 30, fat: 30 },
  maintain: { carbs: 50, protein: 20, fat: 30 },
  gain: { carbs: 50, protein: 25, fat: 25 },
}

export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 }

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return Math.max(0, now.getFullYear() - birthYear)
}

/** Basal metabolic rate (Mifflin-St Jeor). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** Total daily energy expenditure without tracked sport. */
export function tdee(sex: Sex, weightKg: number, heightCm: number, age: number, activityLevel: number): number {
  return bmr(sex, weightKg, heightCm, age) * activityLevel
}

export function dailyAdjustment(goal: GoalType, weeklyRateKg: number): number {
  if (goal === 'maintain') return 0
  const perDay = (Math.abs(weeklyRateKg) * KCAL_PER_KG_FAT) / 7
  return goal === 'lose' ? -perDay : perDay
}

export interface CalorieGoalResult {
  bmr: number
  tdee: number
  /** The calculated goal before applying the safety floor. */
  raw: number
  goal: number
  clamped: boolean
}

export function calculateCalorieGoal(p: Pick<Profile, 'sex' | 'birthYear' | 'heightCm' | 'activityLevel' | 'goal' | 'weeklyRateKg'>, currentWeightKg: number): CalorieGoalResult {
  const age = ageFromBirthYear(p.birthYear)
  const b = bmr(p.sex, currentWeightKg, p.heightCm, age)
  const t = b * p.activityLevel
  const raw = t + dailyAdjustment(p.goal, p.weeklyRateKg)
  const floor = MIN_CALORIES[p.sex]
  const clamped = raw < floor
  const goal = roundTo(Math.max(raw, floor), 10)
  return { bmr: Math.round(b), tdee: Math.round(t), raw: Math.round(raw), goal, clamped }
}

/** Daily calorie goal for a profile (respects the manual override). */
export function calorieGoal(p: Profile, currentWeightKg: number): number {
  if (p.calorieGoalOverride && p.calorieGoalOverride > 0) return Math.round(p.calorieGoalOverride)
  return calculateCalorieGoal(p, currentWeightKg).goal
}

export interface MacroGoals {
  carbs: number
  protein: number
  fat: number
}

export function macroGoals(kcal: number, split: MacroSplit): MacroGoals {
  return {
    carbs: Math.round((kcal * split.carbs) / 100 / 4),
    protein: Math.round((kcal * split.protein) / 100 / 4),
    fat: Math.round((kcal * split.fat) / 100 / 9),
  }
}

export function recommendedWaterMl(weightKg: number): number {
  return clamp(roundTo(weightKg * 35, 250), 1500, 4000)
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return m > 0 ? weightKg / (m * m) : 0
}

export function bmiCategory(value: number): { label: string; tone: 'low' | 'ok' | 'high' | 'veryhigh' } {
  if (value < 18.5) return { label: 'Untergewicht', tone: 'low' }
  if (value < 25) return { label: 'Normalgewicht', tone: 'ok' }
  if (value < 30) return { label: 'Übergewicht', tone: 'high' }
  return { label: 'Adipositas', tone: 'veryhigh' }
}

/** Estimated date to reach the goal weight, or undefined if not applicable. */
export function estimateGoalDate(currentKg: number, goalKg: number, weeklyRateKg: number, from = new Date()): Date | undefined {
  const diff = Math.abs(currentKg - goalKg)
  if (diff < 0.05 || weeklyRateKg <= 0) return undefined
  const weeks = diff / weeklyRateKg
  const d = new Date(from)
  d.setDate(d.getDate() + Math.ceil(weeks * 7))
  return d
}

// ---------- nutrient math ----------

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

const OPTIONAL_KEYS = ['sugar', 'fiber', 'saturatedFat', 'salt'] as const
const ALL_KEYS = ['kcal', 'protein', 'carbs', 'fat', ...OPTIONAL_KEYS] as const

/** Scale per-100 values to an amount in base units. */
export function scaleNutrients(per100: Nutrients, amount: number): Nutrients {
  const f = amount / 100
  const out: Nutrients = {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  }
  for (const k of OPTIONAL_KEYS) {
    const v = per100[k]
    if (v !== undefined && v !== null && !Number.isNaN(v)) out[k] = v * f
  }
  return out
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const out: Nutrients = { ...EMPTY_NUTRIENTS }
  for (const n of list) {
    for (const k of ALL_KEYS) {
      const v = n[k]
      if (v === undefined || v === null || Number.isNaN(v)) continue
      out[k] = (out[k] ?? 0) + v
    }
  }
  return out
}

/** Energy in kcal derived from macros (used for plausibility checks / quick add). */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9
}

/** Convert a quantity in a unit (base unit or serving label) to base units. */
export function toBaseAmount(quantity: number, unit: string, servings: Serving[] | undefined): number {
  if (unit === 'g' || unit === 'ml') return quantity
  const s = servings?.find((x) => x.label === unit)
  return s ? quantity * s.amount : quantity
}

/** Per-100 values of a recipe from its ingredients and total weight. */
export function recipePer100(ingredients: { grams: number; per100: Nutrients }[], totalWeight?: number): Nutrients {
  const total = sumNutrients(ingredients.map((i) => scaleNutrients(i.per100, i.grams)))
  const weight = totalWeight && totalWeight > 0 ? totalWeight : ingredients.reduce((a, i) => a + i.grams, 0)
  if (weight <= 0) return { ...EMPTY_NUTRIENTS }
  return scaleNutrients(total, (100 / weight) * 100)
}

// ---------- helpers ----------

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step
}
