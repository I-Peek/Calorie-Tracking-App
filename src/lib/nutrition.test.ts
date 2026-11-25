import { describe, expect, it } from 'vitest'
import { bmr, calculateCalorieGoal, macroGoals, recipePer100, recommendedWaterMl, scaleNutrients, sumNutrients, toBaseAmount, estimateGoalDate, bmi } from './nutrition'

describe('energy calculations', () => {
  it('computes Mifflin-St Jeor BMR', () => {
    // 80 kg, 180 cm, 30 years, male: 800 + 1125 - 150 + 5
    expect(bmr('male', 80, 180, 30)).toBe(1780)
    // 65 kg, 165 cm, 30 years, female: 650 + 1031.25 - 150 - 161
    expect(bmr('female', 65, 165, 30)).toBeCloseTo(1370.25)
  })

  it('applies activity level and weekly deficit', () => {
    const year = new Date().getFullYear()
    const r = calculateCalorieGoal({ sex: 'male', birthYear: year - 30, heightCm: 180, activityLevel: 1.375, goal: 'lose', weeklyRateKg: 0.5 }, 80)
    expect(r.tdee).toBe(Math.round(1780 * 1.375))
    // 0.5 kg/week = 550 kcal/day deficit
    expect(r.raw).toBe(Math.round(1780 * 1.375 - 550))
    expect(r.goal % 10).toBe(0)
    expect(r.clamped).toBe(false)
  })

  it('never goes below the safety floor', () => {
    const year = new Date().getFullYear()
    const r = calculateCalorieGoal({ sex: 'female', birthYear: year - 60, heightCm: 150, activityLevel: 1.2, goal: 'lose', weeklyRateKg: 1 }, 50)
    expect(r.goal).toBe(1200)
    expect(r.clamped).toBe(true)
  })

  it('adds a surplus when gaining', () => {
    const year = new Date().getFullYear()
    const r = calculateCalorieGoal({ sex: 'male', birthYear: year - 25, heightCm: 180, activityLevel: 1.55, goal: 'gain', weeklyRateKg: 0.25 }, 70)
    expect(r.raw).toBeGreaterThan(r.tdee)
  })

  it('splits macros into grams', () => {
    expect(macroGoals(2000, { carbs: 50, protein: 20, fat: 30 })).toEqual({ carbs: 250, protein: 100, fat: 67 })
  })

  it('recommends water based on weight', () => {
    expect(recommendedWaterMl(70)).toBe(2500)
    expect(recommendedWaterMl(30)).toBe(1500)
    expect(recommendedWaterMl(200)).toBe(4000)
  })

  it('computes BMI', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 1)
  })

  it('estimates the goal date', () => {
    const from = new Date(2026, 0, 1)
    const d = estimateGoalDate(80, 75, 0.5, from)!
    expect(Math.round((d.getTime() - from.getTime()) / 86400000)).toBe(70)
    expect(estimateGoalDate(75, 75, 0.5)).toBeUndefined()
  })
})

describe('nutrient math', () => {
  const per100 = { kcal: 200, protein: 10, carbs: 20, fat: 8, sugar: 5 }

  it('scales per-100 values', () => {
    expect(scaleNutrients(per100, 50)).toEqual({ kcal: 100, protein: 5, carbs: 10, fat: 4, sugar: 2.5 })
  })

  it('sums nutrients including optional fields', () => {
    const s = sumNutrients([per100, { kcal: 100, protein: 1, carbs: 2, fat: 3 }])
    expect(s).toEqual({ kcal: 300, protein: 11, carbs: 22, fat: 11, sugar: 5 })
  })

  it('converts servings to base units', () => {
    const servings = [{ label: '1 Riegel', amount: 45 }]
    expect(toBaseAmount(2, '1 Riegel', servings)).toBe(90)
    expect(toBaseAmount(150, 'g', servings)).toBe(150)
  })

  it('computes recipe values per 100 g', () => {
    const ingredients = [
      { grams: 100, per100: { kcal: 400, protein: 10, carbs: 70, fat: 5 } },
      { grams: 300, per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },
    ]
    expect(recipePer100(ingredients).kcal).toBeCloseTo(100)
    // Cooked weight (e.g. water evaporated) changes the density
    expect(recipePer100(ingredients, 200).kcal).toBeCloseTo(200)
  })
})
