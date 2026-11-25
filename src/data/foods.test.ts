import { describe, expect, it } from 'vitest'
import { BUILTIN_FOODS } from './foods'

describe('builtin food database', () => {
  it('has unique keys', () => {
    const keys = BUILTIN_FOODS.map((f) => f.sourceKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has plausible energy values (Atwater check)', () => {
    for (const f of BUILTIN_FOODS) {
      const n = f.per100
      const macro = n.protein * 4 + n.carbs * 4 + n.fat * 9 + (n.fiber ?? 0) * 2
      // Alcoholic drinks get energy from alcohol, which is not a macro here.
      if (['bier', 'weisswein', 'rotwein'].includes(f.sourceKey)) continue
      expect(Math.abs(macro - n.kcal), `${f.name}: ${macro.toFixed(0)} vs ${n.kcal}`).toBeLessThan(Math.max(15, n.kcal * 0.12))
      expect(n.sugar ?? 0).toBeLessThanOrEqual(n.carbs + 0.01)
      expect(n.saturatedFat ?? 0).toBeLessThanOrEqual(n.fat + 0.01)
      expect(n.protein + n.carbs + n.fat + (n.fiber ?? 0)).toBeLessThanOrEqual(101)
    }
  })

  it('has positive serving sizes', () => {
    for (const f of BUILTIN_FOODS) for (const s of f.servings) expect(s.amount).toBeGreaterThan(0)
  })
})
