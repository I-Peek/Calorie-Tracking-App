import Dexie, { type EntityTable } from 'dexie'
import type {
  ActivityEntry,
  DiaryEntry,
  FastingSession,
  Food,
  SettingRow,
  WaterDay,
  WeightEntry,
} from './types'

export class NutriDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<DiaryEntry, 'id'>
  water!: EntityTable<WaterDay, 'date'>
  activities!: EntityTable<ActivityEntry, 'id'>
  weights!: EntityTable<WeightEntry, 'date'>
  fasting!: EntityTable<FastingSession, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'nutrilog') {
    super(name)
    this.version(1).stores({
      foods: '++id, source, sourceKey, barcode, name, favorite, lastUsed',
      entries: '++id, date, [date+meal], foodId',
      water: 'date',
      activities: '++id, date',
      weights: 'date',
      fasting: '++id, start',
      settings: 'key',
    })
  }
}

export const db = new NutriDB()

/** Ask the browser to keep our data even under storage pressure (important on iOS). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* ignore */
  }
  return false
}
