/**
 * Activities with MET values (Compendium of Physical Activities, 2011).
 * Burned calories are reported as *active* calories, i.e. without the resting
 * metabolism that is already part of the daily calorie budget:
 *   kcal = (MET − 1) × body weight (kg) × duration (h)
 */
export interface ActivityDef {
  key: string
  name: string
  met: number
  emoji: string
}

export const ACTIVITIES: ActivityDef[] = [
  { key: 'gehen', name: 'Spazierengehen (5 km/h)', met: 3.5, emoji: '🚶' },
  { key: 'gehen-zuegig', name: 'Zügiges Gehen (6 km/h)', met: 4.3, emoji: '🚶' },
  { key: 'wandern', name: 'Wandern', met: 6, emoji: '🥾' },
  { key: 'joggen', name: 'Joggen (8 km/h)', met: 8.3, emoji: '🏃' },
  { key: 'laufen-10', name: 'Laufen (10 km/h)', met: 9.8, emoji: '🏃' },
  { key: 'laufen-12', name: 'Laufen (12 km/h)', met: 11.8, emoji: '🏃' },
  { key: 'rad-gemuetlich', name: 'Radfahren (gemütlich)', met: 4, emoji: '🚲' },
  { key: 'rad-moderat', name: 'Radfahren (16–19 km/h)', met: 6.8, emoji: '🚴' },
  { key: 'rad-zuegig', name: 'Radfahren (20–22 km/h)', met: 8, emoji: '🚴' },
  { key: 'spinning', name: 'Indoor Cycling / Spinning', met: 8.5, emoji: '🚴' },
  { key: 'ergometer', name: 'Ergometer (moderat)', met: 6.8, emoji: '🚴' },
  { key: 'crosstrainer', name: 'Crosstrainer', met: 5, emoji: '🏋️' },
  { key: 'rudern', name: 'Rudergerät (moderat)', met: 7, emoji: '🚣' },
  { key: 'schwimmen', name: 'Schwimmen (gemütlich)', met: 6, emoji: '🏊' },
  { key: 'schwimmen-zuegig', name: 'Schwimmen (zügig)', met: 8.3, emoji: '🏊' },
  { key: 'kraft', name: 'Krafttraining (moderat)', met: 3.5, emoji: '🏋️' },
  { key: 'kraft-intensiv', name: 'Krafttraining (intensiv)', met: 6, emoji: '🏋️' },
  { key: 'hiit', name: 'HIIT / Zirkeltraining', met: 8, emoji: '🔥' },
  { key: 'seilspringen', name: 'Seilspringen', met: 11.8, emoji: '🪢' },
  { key: 'yoga', name: 'Yoga', met: 2.5, emoji: '🧘' },
  { key: 'pilates', name: 'Pilates', met: 3, emoji: '🧘' },
  { key: 'stretching', name: 'Dehnen / Stretching', met: 2.3, emoji: '🤸' },
  { key: 'tanzen', name: 'Tanzen', met: 5, emoji: '💃' },
  { key: 'fussball', name: 'Fußball', met: 7, emoji: '⚽' },
  { key: 'basketball', name: 'Basketball', met: 6.5, emoji: '🏀' },
  { key: 'volleyball', name: 'Volleyball', met: 4, emoji: '🏐' },
  { key: 'tennis', name: 'Tennis', met: 7.3, emoji: '🎾' },
  { key: 'badminton', name: 'Badminton', met: 5.5, emoji: '🏸' },
  { key: 'tischtennis', name: 'Tischtennis', met: 4, emoji: '🏓' },
  { key: 'klettern', name: 'Klettern / Bouldern', met: 7.5, emoji: '🧗' },
  { key: 'kampfsport', name: 'Kampfsport / Boxen', met: 7, emoji: '🥊' },
  { key: 'inline', name: 'Inline-Skaten', met: 7.5, emoji: '🛼' },
  { key: 'ski', name: 'Ski Alpin', met: 5.3, emoji: '⛷️' },
  { key: 'golf', name: 'Golf', met: 4.8, emoji: '⛳' },
  { key: 'treppen', name: 'Treppensteigen', met: 4, emoji: '🪜' },
  { key: 'hausarbeit', name: 'Hausarbeit', met: 3.3, emoji: '🧹' },
  { key: 'gartenarbeit', name: 'Gartenarbeit', met: 3.8, emoji: '🌱' },
]

export const STEPS_KEY = 'schritte'
export const CUSTOM_ACTIVITY_KEY = 'eigene'

export function activityByKey(key: string): ActivityDef | undefined {
  return ACTIVITIES.find((a) => a.key === key)
}

export function activityEmoji(key: string): string {
  if (key === STEPS_KEY) return '👣'
  if (key === CUSTOM_ACTIVITY_KEY) return '⚡'
  return activityByKey(key)?.emoji ?? '⚡'
}

/** Active calories for an activity. */
export function activityKcal(met: number, weightKg: number, minutes: number): number {
  return Math.max(0, Math.round((met - 1) * weightKg * (minutes / 60)))
}

/** Active calories for a number of steps (≈ 100 steps/min at 3.5 MET). */
export function stepsKcal(steps: number, weightKg: number): number {
  return Math.max(0, Math.round(((3.5 - 1) * weightKg * steps) / 6000))
}
