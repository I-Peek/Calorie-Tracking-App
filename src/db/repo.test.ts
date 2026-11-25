import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addEntry, addWater, copyMeal, toggleFavorite, updateEntryAmount, upsertFood } from './repo'
import { getBuiltinFood } from '../data/foods'
import { createBackup, parseBackup, restoreBackup, wipeAllData } from '../lib/backup'

beforeEach(async () => {
  await wipeAllData()
})

describe('repository', () => {
  it('adds entries with computed nutrients and tracks usage', async () => {
    const apple = getBuiltinFood('apfel')!
    await addEntry({ date: '2026-01-01', meal: 'snack', food: apple, quantity: 1, unit: '1 Apfel (mittel)' })
    await addEntry({ date: '2026-01-01', meal: 'snack', food: apple, quantity: 100, unit: 'g' })
    const entries = await db.entries.toArray()
    expect(entries).toHaveLength(2)
    expect(entries[0].grams).toBe(150)
    expect(entries[0].nutrients.kcal).toBeCloseTo(78)
    const foods = await db.foods.toArray()
    expect(foods).toHaveLength(1) // de-duplicated by source key
    expect(foods[0].useCount).toBe(2)
  })

  it('updates the amount of an entry', async () => {
    const id = await addEntry({ date: '2026-01-01', meal: 'lunch', food: getBuiltinFood('reis-gekocht')!, quantity: 100, unit: 'g' })
    const e = (await db.entries.get(id))!
    await updateEntryAmount(e, 200, 'g', 'dinner')
    const u = (await db.entries.get(id))!
    expect(u.nutrients.kcal).toBeCloseTo(260)
    expect(u.meal).toBe('dinner')
  })

  it('copies a meal to another day', async () => {
    await addEntry({ date: '2026-01-01', meal: 'breakfast', food: getBuiltinFood('haferflocken')!, quantity: 1, unit: '1 Portion' })
    await addEntry({ date: '2026-01-01', meal: 'breakfast', food: getBuiltinFood('banane')!, quantity: 1, unit: '1 Banane (geschält)' })
    expect(await copyMeal('2026-01-01', '2026-01-02', 'breakfast')).toBe(2)
    expect(await db.entries.where('date').equals('2026-01-02').count()).toBe(2)
  })

  it('never lets water go negative', async () => {
    await addWater('2026-01-01', 250)
    await addWater('2026-01-01', -500)
    expect((await db.water.get('2026-01-01'))!.ml).toBe(0)
  })

  it('toggles favourites on foods that are not stored yet', async () => {
    const f = await toggleFavorite(getBuiltinFood('skyr')!)
    expect(f.favorite).toBe(1)
    const again = await toggleFavorite(getBuiltinFood('skyr')!)
    expect(again.favorite).toBe(0)
    expect(await db.foods.count()).toBe(1)
  })

  it('round-trips a backup', async () => {
    await upsertFood({ source: 'custom', name: 'Test', baseUnit: 'g', per100: { kcal: 1, protein: 0, carbs: 0, fat: 0 }, servings: [], createdAt: 1 })
    await addWater('2026-01-01', 500)
    const json = JSON.stringify(await createBackup())
    await wipeAllData()
    expect(await db.foods.count()).toBe(0)
    await restoreBackup(parseBackup(json))
    expect(await db.foods.count()).toBe(1)
    expect((await db.water.get('2026-01-01'))!.ml).toBe(500)
    expect(() => parseBackup('{"foo":1}')).toThrow()
  })
})
