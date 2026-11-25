import { db } from './db'
import type { ActivityEntry, DiaryEntry, Food, MealType, Nutrients, Profile, WeightEntry } from './types'
import { scaleNutrients, toBaseAmount } from '../lib/nutrition'
import { addDays } from '../lib/dates'

// ---------- settings / profile ----------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setSetting('profile', profile)
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const current = await getSetting<Profile>('profile')
  if (!current) return
  await saveProfile({ ...current, ...patch })
}

// ---------- foods ----------

/** Insert or update a food. Builtin / Open Food Facts foods are matched by their source key. */
export async function upsertFood(food: Food): Promise<number> {
  if (food.id) {
    await db.foods.put(food)
    return food.id
  }
  if ((food.source === 'off' || food.source === 'builtin') && food.sourceKey) {
    const existing = await db.foods.where('sourceKey').equals(food.sourceKey).filter((f) => f.source === food.source).first()
    if (existing?.id) {
      await db.foods.update(existing.id, {
        name: food.name,
        brand: food.brand,
        imageUrl: food.imageUrl ?? existing.imageUrl,
        baseUnit: food.baseUnit,
        per100: food.per100,
        servings: food.servings,
        nutriScore: food.nutriScore,
        category: food.category,
        updatedAt: Date.now(),
      })
      return existing.id
    }
  }
  const { id: _ignored, ...rest } = food
  void _ignored
  return (await db.foods.add({ ...rest, createdAt: food.createdAt || Date.now() })) as number
}

export async function toggleFavorite(food: Food): Promise<Food> {
  const id = await upsertFood(food)
  const stored = await db.foods.get(id)
  const favorite: 0 | 1 = stored?.favorite === 1 ? 0 : 1
  await db.foods.update(id, { favorite })
  return { ...(stored ?? food), id, favorite }
}

export async function deleteFood(id: number): Promise<void> {
  await db.foods.delete(id)
}

export async function findFoodByBarcode(barcode: string): Promise<Food | undefined> {
  return db.foods.where('barcode').equals(barcode).first()
}

// ---------- diary ----------

export interface EntryInput {
  date: string
  meal: MealType
  food: Food
  quantity: number
  unit: string
}

export function buildEntry({ date, meal, food, quantity, unit }: EntryInput): Omit<DiaryEntry, 'id' | 'createdAt'> {
  const grams = toBaseAmount(quantity, unit, food.servings)
  return {
    date,
    meal,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    imageUrl: food.imageUrl,
    baseUnit: food.baseUnit,
    per100: food.per100,
    servings: food.servings,
    grams,
    unit,
    quantity,
    nutrients: scaleNutrients(food.per100, grams),
  }
}

export async function addEntry(input: EntryInput): Promise<number> {
  const foodId = await upsertFood(input.food)
  const now = Date.now()
  const stored = await db.foods.get(foodId)
  await db.foods.update(foodId, { lastUsed: now, useCount: (stored?.useCount ?? 0) + 1 })
  const entry = buildEntry({ ...input, food: { ...input.food, id: foodId } })
  return (await db.entries.add({ ...entry, createdAt: now })) as number
}

export async function updateEntryAmount(entry: DiaryEntry, quantity: number, unit: string, meal?: MealType): Promise<void> {
  if (!entry.id || !entry.per100) return
  const grams = toBaseAmount(quantity, unit, entry.servings)
  await db.entries.update(entry.id, {
    quantity,
    unit,
    grams,
    meal: meal ?? entry.meal,
    nutrients: scaleNutrients(entry.per100, grams),
  })
}

export async function addQuickEntry(date: string, meal: MealType, name: string, nutrients: Nutrients): Promise<number> {
  return (await db.entries.add({
    date,
    meal,
    name: name.trim() || 'Schnelleintrag',
    baseUnit: 'g',
    grams: 0,
    unit: 'quick',
    quantity: 1,
    nutrients,
    quick: true,
    createdAt: Date.now(),
  })) as number
}

export async function updateQuickEntry(id: number, name: string, nutrients: Nutrients, meal: MealType): Promise<void> {
  await db.entries.update(id, { name: name.trim() || 'Schnelleintrag', nutrients, meal })
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

export async function restoreEntry(entry: DiaryEntry): Promise<void> {
  await db.entries.put(entry)
}

export async function moveEntry(id: number, meal: MealType): Promise<void> {
  await db.entries.update(id, { meal })
}

/** Copy all entries of a meal from one day to another. Returns the number of copied entries. */
export async function copyMeal(fromDate: string, toDate: string, meal: MealType, toMeal: MealType = meal): Promise<number> {
  const source = await db.entries.where('[date+meal]').equals([fromDate, meal]).toArray()
  const now = Date.now()
  await db.entries.bulkAdd(
    source.map(({ id: _id, ...e }, i) => {
      void _id
      return { ...e, date: toDate, meal: toMeal, createdAt: now + i }
    }),
  )
  return source.length
}

export async function previousDayWithMeal(date: string, meal: MealType, maxDays = 14): Promise<string | undefined> {
  for (let i = 1; i <= maxDays; i++) {
    const d = addDays(date, -i)
    const n = await db.entries.where('[date+meal]').equals([d, meal]).count()
    if (n > 0) return d
  }
  return undefined
}

// ---------- water ----------

export async function addWater(date: string, deltaMl: number): Promise<void> {
  await db.transaction('rw', db.water, async () => {
    const cur = await db.water.get(date)
    const ml = Math.max(0, (cur?.ml ?? 0) + deltaMl)
    await db.water.put({ date, ml, updatedAt: Date.now() })
  })
}

export async function setWater(date: string, ml: number): Promise<void> {
  await db.water.put({ date, ml: Math.max(0, Math.round(ml)), updatedAt: Date.now() })
}

// ---------- activities ----------

export async function addActivity(a: Omit<ActivityEntry, 'id' | 'createdAt'>): Promise<number> {
  return (await db.activities.add({ ...a, createdAt: Date.now() })) as number
}

export async function updateActivity(id: number, patch: Partial<ActivityEntry>): Promise<void> {
  await db.activities.update(id, patch)
}

export async function deleteActivity(id: number): Promise<void> {
  await db.activities.delete(id)
}

// ---------- weight ----------

export async function saveWeight(entry: Omit<WeightEntry, 'createdAt'>): Promise<void> {
  await db.weights.put({ ...entry, createdAt: Date.now() })
}

export async function deleteWeight(date: string): Promise<void> {
  await db.weights.delete(date)
}

/** Most recent weight on or before a date. */
export async function weightOn(date: string): Promise<WeightEntry | undefined> {
  return db.weights.where('date').belowOrEqual(date).last()
}

// ---------- fasting ----------

export async function startFast(plan: string, targetHours: number, start = Date.now()): Promise<number> {
  return (await db.fasting.add({ start, targetHours, plan })) as number
}

export async function endFast(id: number, end = Date.now()): Promise<void> {
  await db.fasting.update(id, { end })
}

export async function updateFast(id: number, patch: { start?: number; end?: number }): Promise<void> {
  await db.fasting.update(id, patch)
}

export async function deleteFast(id: number): Promise<void> {
  await db.fasting.delete(id)
}
