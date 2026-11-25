import { db } from '../db/db'
import { todayISO } from './dates'

const TABLES = ['foods', 'entries', 'water', 'activities', 'weights', 'fasting', 'settings'] as const
type TableName = (typeof TABLES)[number]

export interface BackupFile {
  app: 'nutrilog'
  version: 1
  exportedAt: string
  tables: Record<TableName, unknown[]>
}

export async function createBackup(): Promise<BackupFile> {
  const tables = {} as Record<TableName, unknown[]>
  for (const t of TABLES) tables[t] = await db.table(t).toArray()
  return { app: 'nutrilog', version: 1, exportedAt: new Date().toISOString(), tables }
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist keine gültige Sicherung (kein JSON).')
  }
  const b = data as Partial<BackupFile>
  if (!b || b.app !== 'nutrilog' || !b.tables || typeof b.tables !== 'object') {
    throw new Error('Die Datei ist keine NutriLog-Sicherung.')
  }
  if (b.version !== 1) throw new Error('Diese Sicherung stammt aus einer neueren App-Version.')
  for (const t of TABLES) {
    if (b.tables[t] !== undefined && !Array.isArray(b.tables[t])) throw new Error(`Ungültige Daten in „${t}“.`)
  }
  return b as BackupFile
}

/** Replace all local data with the backup. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = backup.tables[t] ?? []
      if (rows.length) await db.table(t).bulkAdd(rows)
    }
  })
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
}

/** Save the backup: share sheet on phones (iOS/Android), download elsewhere. */
export async function downloadBackup(): Promise<'shared' | 'downloaded'> {
  const backup = await createBackup()
  const json = JSON.stringify(backup)
  const name = `nutrilog-backup-${todayISO()}.json`
  const file = new File([json], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] }) && /iphone|ipad|android/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file], title: 'NutriLog Sicherung' })
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'shared'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
