import { useState } from 'react'
import type { Food } from '../db/types'
import { cx } from './ui'

const CATEGORY_EMOJI: Record<string, string> = {
  Obst: '🍎',
  Gemüse: '🥦',
  'Brot & Backwaren': '🍞',
  'Getreide & Beilagen': '🍚',
  Milchprodukte: '🥛',
  Käse: '🧀',
  Eier: '🥚',
  'Fleisch & Wurst': '🍗',
  'Fisch & Meeresfrüchte': '🐟',
  'Hülsenfrüchte, Nüsse & Samen': '🥜',
  'Öle & Fette': '🫒',
  'Süßes & Snacks': '🍫',
  Getränke: '🥤',
  'Saucen & Aufstriche': '🥫',
  'Gerichte & Fast Food': '🍕',
}

export function foodEmoji(food: Pick<Food, 'category' | 'source' | 'baseUnit'>): string {
  if (food.source === 'recipe') return '🍲'
  if (food.category && CATEGORY_EMOJI[food.category]) return CATEGORY_EMOJI[food.category]
  return food.baseUnit === 'ml' ? '🥤' : '🍽️'
}

export function FoodAvatar({ food, size = 'md' }: { food: Pick<Food, 'category' | 'source' | 'baseUnit' | 'imageUrl'>; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const dim = size === 'sm' ? 'size-9 text-lg rounded-xl' : size === 'lg' ? 'size-20 text-4xl rounded-3xl' : 'size-11 text-xl rounded-2xl'
  if (food.imageUrl && !failed) {
    return (
      <img
        src={food.imageUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cx(dim, 'shrink-0 bg-white object-contain p-0.5 ring-1 ring-line')}
      />
    )
  }
  return <div className={cx(dim, 'flex shrink-0 items-center justify-center bg-surface-2')}>{foodEmoji(food)}</div>
}
