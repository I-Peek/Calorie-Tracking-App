import type { BaseUnit, Food, Nutrients, Serving } from '../db/types'

/**
 * Open Food Facts – free, open product database (https://world.openfoodfacts.org).
 * Data is licensed under the Open Database License (ODbL).
 * Rate limits: 100 product requests/min, 10 search requests/min per user.
 */

const PRODUCT_API = 'https://world.openfoodfacts.org/api/v2/product'
const SEARCH_API = 'https://search.openfoodfacts.org/search'
const LEGACY_SEARCH_API = 'https://de.openfoodfacts.org/cgi/search.pl'

const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name_de',
  'brands',
  'quantity',
  'product_quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'nutriscore_grade',
  'image_front_small_url',
  'image_front_url',
  'image_small_url',
].join(',')

export class OffError extends Error {
  readonly kind: 'offline' | 'notfound' | 'network' | 'ratelimit'
  constructor(kind: OffError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

type Dict = Record<string, unknown>

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (v && typeof v === 'object') {
    // search-a-licious may return translated fields as { de, en, main, ... }
    const o = v as Dict
    for (const k of ['de', 'main', 'en']) {
      const s = o[k]
      if (typeof s === 'string' && s.trim()) return s.trim()
    }
    for (const s of Object.values(o)) if (typeof s === 'string' && s.trim()) return s.trim()
  }
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(', ') || undefined
  return undefined
}

function round(v: number, d = 2): number {
  const f = 10 ** d
  return Math.round(v * f) / f
}

export function parseNutriments(n: Dict | undefined): Nutrients | undefined {
  if (!n) return undefined
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj !== undefined) kcal = kj / 4.184
  }
  if (kcal === undefined) return undefined
  const protein = num(n['proteins_100g']) ?? 0
  const carbs = num(n['carbohydrates_100g']) ?? 0
  const fat = num(n['fat_100g']) ?? 0
  const out: Nutrients = { kcal: round(kcal, 1), protein: round(protein), carbs: round(carbs), fat: round(fat) }
  const sugar = num(n['sugars_100g'])
  const fiber = num(n['fiber_100g'])
  const sat = num(n['saturated-fat_100g'])
  let salt = num(n['salt_100g'])
  if (salt === undefined) {
    const sodium = num(n['sodium_100g'])
    if (sodium !== undefined) salt = sodium * 2.5
  }
  if (sugar !== undefined) out.sugar = round(sugar)
  if (fiber !== undefined) out.fiber = round(fiber)
  if (sat !== undefined) out.saturatedFat = round(sat)
  if (salt !== undefined) out.salt = round(salt, 3)
  return out
}

function detectUnit(p: Dict): BaseUnit {
  const q = `${str(p.quantity) ?? ''} ${str(p.serving_size) ?? ''}`.toLowerCase()
  if (/\d\s*(ml|cl|l|liter|litre)\b/.test(q)) return 'ml'
  return 'g'
}

/** Convert a raw Open Food Facts product to our Food model. Returns undefined without usable nutrition data. */
export function productToFood(p: Dict): Food | undefined {
  const code = str(p.code)
  const per100 = parseNutriments(p.nutriments as Dict | undefined)
  if (!code || !per100) return undefined
  const baseUnit = detectUnit(p)
  const servings: Serving[] = []
  const servingQty = num(p.serving_quantity)
  const servingSize = str(p.serving_size)
  if (servingQty && servingQty > 0 && servingQty < 5000) {
    servings.push({ label: servingSize ? `1 Portion (${servingSize})` : '1 Portion', amount: round(servingQty, 1) })
  }
  const packageQty = num(p.product_quantity)
  if (packageQty && packageQty > 0 && packageQty <= 3000 && packageQty !== servingQty) {
    servings.push({ label: `1 Packung (${round(packageQty, 0)} ${baseUnit})`, amount: round(packageQty, 1) })
  }
  const brand = str(p.brands)?.split(',')[0]?.trim()
  const grade = str(p.nutriscore_grade)?.toLowerCase()
  return {
    source: 'off',
    sourceKey: code,
    barcode: code,
    name: str(p.product_name_de) ?? str(p.product_name) ?? str(p.generic_name_de) ?? 'Unbenanntes Produkt',
    brand,
    imageUrl: str(p.image_front_small_url) ?? str(p.image_small_url) ?? str(p.image_front_url),
    baseUnit,
    per100,
    servings,
    nutriScore: grade && /^[a-e]$/.test(grade) ? grade : undefined,
    createdAt: Date.now(),
  }
}

async function fetchJson(url: string, timeoutMs = 9000, signal?: AbortSignal): Promise<Dict> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new OffError('offline', 'Du bist offline.')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (res.status === 429) throw new OffError('ratelimit', 'Zu viele Anfragen – bitte kurz warten.')
    if (res.status === 404) {
      // v2 product endpoint answers 404 with a JSON body for unknown barcodes.
      try {
        return (await res.json()) as Dict
      } catch {
        throw new OffError('notfound', 'Nicht gefunden.')
      }
    }
    if (!res.ok) throw new OffError('network', `Serverfehler (${res.status}).`)
    return (await res.json()) as Dict
  } catch (e) {
    if (e instanceof OffError) throw e
    if (signal?.aborted) throw e
    throw new OffError('network', 'Open Food Facts ist gerade nicht erreichbar.')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Look up a product by barcode (EAN/UPC). Returns undefined if unknown or without nutrition data. */
export async function fetchProductByBarcode(barcode: string): Promise<Food | undefined> {
  const code = barcode.replace(/\D/g, '')
  if (!code) return undefined
  const data = await fetchJson(`${PRODUCT_API}/${encodeURIComponent(code)}.json?fields=${FIELDS}&lc=de`)
  const product = data.product as Dict | undefined
  if (!product || data.status === 0) return undefined
  return productToFood({ code, ...product })
}

/** Full-text product search. Tries the modern search service first, then the legacy API. */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<Food[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const url = `${SEARCH_API}?q=${encodeURIComponent(q)}&langs=de,en&page_size=40&fields=${FIELDS}`
    const data = await fetchJson(url, 7000, signal)
    const hits = (data.hits as Dict[] | undefined) ?? []
    const foods = dedupe(hits.map(productToFood))
    if (foods.length > 0 || hits.length === 0) return foods
  } catch (e) {
    if (signal?.aborted) throw e
    if (e instanceof OffError && e.kind === 'offline') throw e
  }
  const legacy = `${LEGACY_SEARCH_API}?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=40&sort_by=unique_scans_n&lc=de&fields=${FIELDS}`
  const data = await fetchJson(legacy, 12000, signal)
  return dedupe(((data.products as Dict[] | undefined) ?? []).map(productToFood))
}

function dedupe(list: (Food | undefined)[]): Food[] {
  const seen = new Set<string>()
  const out: Food[] = []
  for (const f of list) {
    if (!f || !f.barcode || seen.has(f.barcode)) continue
    seen.add(f.barcode)
    out.push(f)
  }
  return out
}
