/** Local-time date helpers. All diary dates are stored as YYYY-MM-DD in the user's local time zone. */

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function isValidISODate(iso: string | null | undefined): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toISODate(parseISODate(iso)) === iso
}

/** List of ISO dates from `start` to `end` (inclusive). */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  let guard = 0
  while (cur <= end && guard++ < 3700) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

const weekdayLong = new Intl.DateTimeFormat('de-DE', { weekday: 'long' })
const weekdayShort = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })
const dayMonthShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const full = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

/** "Heute", "Gestern", "Morgen" or "Montag, 3. März". */
export function relativeDayLabel(iso: string, today = todayISO()): string {
  if (iso === today) return 'Heute'
  if (iso === addDays(today, -1)) return 'Gestern'
  if (iso === addDays(today, 1)) return 'Morgen'
  const d = parseISODate(iso)
  return `${weekdayLong.format(d)}, ${dayMonth.format(d)}`
}

export function formatDayMonth(iso: string): string {
  return dayMonth.format(parseISODate(iso))
}

export function formatDayMonthShort(iso: string): string {
  return dayMonthShort.format(parseISODate(iso))
}

export function formatFullDate(d: Date | string): string {
  return full.format(typeof d === 'string' ? parseISODate(d) : d)
}

export function formatWeekdayShort(iso: string): string {
  return weekdayShort.format(parseISODate(iso)).replace('.', '')
}

export function formatTime(ts: number): string {
  return time.format(new Date(ts))
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Suggest the meal for the current time of day. */
export function mealForTime(d = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours()
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 15) return 'lunch'
  if (h >= 17 && h < 22) return 'dinner'
  return 'snack'
}
