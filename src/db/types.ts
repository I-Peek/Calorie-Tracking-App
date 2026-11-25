/** Nutrient values. For foods these are per 100 g/ml, for diary entries they are totals. */
export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
  sugar?: number
  fiber?: number
  saturatedFat?: number
  salt?: number
}

export type BaseUnit = 'g' | 'ml'

/** A named portion, expressed in base units (g or ml). */
export interface Serving {
  label: string
  amount: number
}

export type FoodSource = 'builtin' | 'off' | 'custom' | 'recipe'

export interface RecipeIngredient {
  foodId?: number
  name: string
  brand?: string
  grams: number
  baseUnit: BaseUnit
  per100: Nutrients
}

export interface Food {
  id?: number
  source: FoodSource
  /** Stable key for builtin foods (e.g. "apfel") or the barcode for Open Food Facts products. */
  sourceKey?: string
  barcode?: string
  name: string
  brand?: string
  category?: string
  imageUrl?: string
  baseUnit: BaseUnit
  per100: Nutrients
  servings: Serving[]
  nutriScore?: string
  /** 1 = favourite (number so Dexie can index it). */
  favorite?: 0 | 1
  useCount?: number
  lastUsed?: number
  /** Only for recipes. */
  ingredients?: RecipeIngredient[]
  portions?: number
  createdAt: number
  updatedAt?: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface DiaryEntry {
  id?: number
  /** ISO date YYYY-MM-DD (local time). */
  date: string
  meal: MealType
  foodId?: number
  name: string
  brand?: string
  imageUrl?: string
  baseUnit: BaseUnit
  /** Snapshot of the food's nutrients per 100 base units (undefined for quick entries). */
  per100?: Nutrients
  servings?: Serving[]
  /** Amount in base units (g/ml). */
  grams: number
  /** How the user entered the amount: unit label ('g', 'ml' or a serving label) and quantity. */
  unit: string
  quantity: number
  /** Total nutrients of this entry. */
  nutrients: Nutrients
  quick?: boolean
  createdAt: number
}

export interface WaterDay {
  date: string
  ml: number
  updatedAt: number
}

export interface ActivityEntry {
  id?: number
  date: string
  activityKey: string
  name: string
  minutes: number
  kcal: number
  /** For step entries. */
  steps?: number
  createdAt: number
}

export interface WeightEntry {
  date: string
  kg: number
  bodyFat?: number
  waistCm?: number
  createdAt: number
}

export interface FastingSession {
  id?: number
  start: number
  end?: number
  targetHours: number
  plan: string
}

export type Sex = 'male' | 'female'
export type GoalType = 'lose' | 'maintain' | 'gain'

export interface MacroSplit {
  carbs: number
  protein: number
  fat: number
}

export interface Profile {
  name?: string
  sex: Sex
  birthYear: number
  heightCm: number
  startWeightKg: number
  goalWeightKg: number
  /** Physical activity level factor (without sport). */
  activityLevel: number
  goal: GoalType
  /** kg per week (positive number); direction comes from `goal`. */
  weeklyRateKg: number
  /** Manual override of the daily calorie goal. */
  calorieGoalOverride?: number
  macros: MacroSplit
  waterGoalMl: number
  glassSizeMl: number
  stepsGoal: number
  /** Add burned activity calories to the daily budget. */
  addExerciseCalories: boolean
  fastingPlan: string
  createdAt: number
}

export interface SettingRow {
  key: string
  value: unknown
}
