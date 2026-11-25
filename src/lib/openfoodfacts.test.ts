import { describe, expect, it } from 'vitest'
import { parseNutriments, productToFood } from './openfoodfacts'

describe('Open Food Facts mapping', () => {
  it('maps a typical product', () => {
    const food = productToFood({
      code: '3017620422003',
      product_name: 'Nutella',
      product_name_de: 'Nutella',
      brands: 'Ferrero, Nutella',
      quantity: '400 g',
      product_quantity: 400,
      serving_size: '15 g',
      serving_quantity: 15,
      nutriscore_grade: 'e',
      image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9,
        sugars_100g: 56.3,
        'saturated-fat_100g': 10.6,
        salt_100g: 0.107,
      },
    })!
    expect(food.name).toBe('Nutella')
    expect(food.brand).toBe('Ferrero')
    expect(food.baseUnit).toBe('g')
    expect(food.per100.kcal).toBe(539)
    expect(food.nutriScore).toBe('e')
    expect(food.servings).toEqual([
      { label: '1 Portion (15 g)', amount: 15 },
      { label: '1 Packung (400 g)', amount: 400 },
    ])
  })

  it('detects liquids and converts kJ', () => {
    const food = productToFood({ code: '1', product_name: 'Saft', quantity: '1 l', nutriments: { 'energy-kj_100g': 184, carbohydrates_100g: 10 } })!
    expect(food.baseUnit).toBe('ml')
    expect(food.per100.kcal).toBeCloseTo(44, 0)
  })

  it('rejects products without energy values', () => {
    expect(productToFood({ code: '1', product_name: 'X', nutriments: {} })).toBeUndefined()
    expect(parseNutriments(undefined)).toBeUndefined()
  })

  it('derives salt from sodium', () => {
    expect(parseNutriments({ 'energy-kcal_100g': 10, sodium_100g: 0.4 })!.salt).toBeCloseTo(1)
  })

  it('handles translated name objects', () => {
    const food = productToFood({ code: '2', product_name: { de: 'Apfelmus', en: 'Apple sauce' }, nutriments: { 'energy-kcal_100g': 70 } })!
    expect(food.name).toBe('Apfelmus')
  })
})
