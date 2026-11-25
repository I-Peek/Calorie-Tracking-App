import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Star, WifiOff, X, ChefHat, Clock, PencilLine, Globe } from 'lucide-react'
import { db } from '../db/db'
import type { Food } from '../db/types'
import { BUILTIN_FOODS } from '../data/foods'
import { matchScore } from '../lib/search'
import { OffError, searchProducts } from '../lib/openfoodfacts'
import { fmtGrams, fmtInt } from '../lib/format'
import { FoodAvatar } from './FoodAvatar'
import { NutriScore, Spinner, cx } from './ui'
import { defaultAmount } from './FoodAmountSheet'
import { toBaseAmount } from '../lib/nutrition'

type Tab = 'recent' | 'favorites' | 'custom' | 'recipes'

function foodKey(f: Food): string {
  if (f.id) return `db:${f.id}`
  return `${f.source}:${f.sourceKey ?? f.name}`
}

/** Short description: "1 Apfel (mittel) · 78 kcal" or "100 g · 52 kcal". */
export function servingSummary(f: Food): { label: string; kcal: number } {
  const d = defaultAmount(f)
  const grams = toBaseAmount(d.quantity, d.unit, f.servings)
  const label = d.unit === 'g' || d.unit === 'ml' ? `${fmtGrams(d.quantity)} ${d.unit}` : d.unit
  return { label, kcal: (f.per100.kcal * grams) / 100 }
}

export function FoodRow({ food, onPick, onQuickAdd }: { food: Food; onPick: (f: Food) => void; onQuickAdd?: (f: Food) => void }) {
  const s = servingSummary(food)
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button type="button" onClick={() => onPick(food)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <FoodAvatar food={food} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-ink">{food.name}</span>
            {food.favorite === 1 && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-ink-3">
            <span className="truncate">
              {[food.brand, s.label].filter(Boolean).join(' · ')} · <span className="tnum">{fmtInt(s.kcal)} kcal</span>
            </span>
            <NutriScore grade={food.nutriScore} />
          </span>
        </span>
      </button>
      {onQuickAdd && (
        <button
          type="button"
          aria-label={`${food.name} hinzufügen`}
          onClick={() => onQuickAdd(food)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong transition active:scale-90 dark:text-brand"
        >
          <Plus className="size-5" />
        </button>
      )}
    </li>
  )
}

export function FoodSearch({
  onPick,
  onQuickAdd,
  actions,
  autoFocus,
  excludeRecipes,
}: {
  onPick: (f: Food) => void
  onQuickAdd?: (f: Food) => void
  actions?: ReactNode
  autoFocus?: boolean
  excludeRecipes?: boolean
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('recent')
  const [online, setOnline] = useState<Food[]>([])
  const [onlineState, setOnlineState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [onlineError, setOnlineError] = useState<string>()
  const abortRef = useRef<AbortController | null>(null)
  const lastSearched = useRef('')

  const dbFoods = useLiveQuery(() => db.foods.toArray(), []) ?? []

  const allLocal = useMemo(() => {
    const stored = excludeRecipes ? dbFoods.filter((f) => f.source !== 'recipe') : dbFoods
    const storedBuiltin = new Set(stored.filter((f) => f.source === 'builtin').map((f) => f.sourceKey))
    const builtin = BUILTIN_FOODS.filter((b) => !storedBuiltin.has(b.sourceKey))
    return [...stored, ...builtin]
  }, [dbFoods, excludeRecipes])

  const aliasOf = useMemo(() => new Map(BUILTIN_FOODS.map((b) => [b.sourceKey, `${b.aliases} ${b.category}`])), [])

  const q = query.trim()

  const localResults = useMemo(() => {
    if (!q) return []
    const scored: { f: Food; s: number }[] = []
    for (const f of allLocal) {
      const extra = `${f.brand ?? ''} ${f.source === 'builtin' && f.sourceKey ? (aliasOf.get(f.sourceKey) ?? '') : ''}`
      let s = matchScore(q, f.name, extra)
      if (s <= 0) continue
      s += Math.min(25, Math.log2(1 + (f.useCount ?? 0)) * 6) + (f.favorite ? 15 : 0)
      scored.push({ f, s })
    }
    return scored
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.f)
  }, [q, allLocal, aliasOf])

  const runOnline = (term: string) => {
    abortRef.current?.abort()
    if (term.length < 3) {
      setOnline([])
      setOnlineState('idle')
      return
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    lastSearched.current = term
    setOnlineState('loading')
    setOnlineError(undefined)
    searchProducts(term, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return
        setOnline(res)
        setOnlineState('done')
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return
        setOnline([])
        setOnlineState('error')
        setOnlineError(e instanceof OffError ? e.message : 'Suche fehlgeschlagen.')
      })
  }

  // Debounced online search (Open Food Facts allows ~10 searches per minute).
  useEffect(() => {
    if (q.length < 3) {
      abortRef.current?.abort()
      setOnline([])
      setOnlineState('idle')
      return
    }
    setOnlineState('loading')
    const t = window.setTimeout(() => runOnline(q), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Prefer the stored copy of an online product (keeps favourite flag / custom edits).
  const onlineMerged = useMemo(() => {
    const byBarcode = new Map(dbFoods.filter((f) => f.barcode).map((f) => [f.barcode!, f]))
    const localKeys = new Set(localResults.map((f) => f.barcode).filter(Boolean))
    return online.filter((f) => !localKeys.has(f.barcode)).map((f) => byBarcode.get(f.barcode!) ?? f)
  }, [online, dbFoods, localResults])

  const tabList = useMemo(() => {
    switch (tab) {
      case 'recent':
        return dbFoods
          .filter((f) => f.lastUsed && (!excludeRecipes || f.source !== 'recipe'))
          .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
          .slice(0, 50)
      case 'favorites':
        return dbFoods.filter((f) => f.favorite === 1 && (!excludeRecipes || f.source !== 'recipe')).sort((a, b) => a.name.localeCompare(b.name, 'de'))
      case 'custom':
        return dbFoods.filter((f) => f.source === 'custom').sort((a, b) => a.name.localeCompare(b.name, 'de'))
      case 'recipes':
        return dbFoods.filter((f) => f.source === 'recipe').sort((a, b) => a.name.localeCompare(b.name, 'de'))
    }
  }, [tab, dbFoods, excludeRecipes])

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'recent', label: 'Zuletzt', icon: <Clock className="size-4" /> },
    { key: 'favorites', label: 'Favoriten', icon: <Star className="size-4" /> },
    { key: 'custom', label: 'Eigene', icon: <PencilLine className="size-4" /> },
    ...(excludeRecipes ? [] : [{ key: 'recipes' as Tab, label: 'Rezepte', icon: <ChefHat className="size-4" /> }]),
  ]

  return (
    <div>
      <form
        className="relative"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          ;(document.activeElement as HTMLElement | null)?.blur()
          lastSearched.current = ''
          runOnline(q)
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lebensmittel oder Marke suchen"
          aria-label="Lebensmittel suchen"
          className="h-12 w-full rounded-2xl border border-line bg-surface pl-12 pr-11 text-ink shadow-card outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" aria-label="Suche leeren" onClick={() => setQuery('')} className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-3 text-ink-2">
            <X className="size-4" />
          </button>
        )}
      </form>

      {actions && !q && <div className="mt-3">{actions}</div>}

      {!q ? (
        <>
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cx(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition',
                  tab === t.key ? 'bg-ink text-page' : 'bg-surface text-ink-2 shadow-card hover:text-ink',
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-3xl bg-surface px-4 shadow-card">
            {tabList.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">
                {tab === 'recent' && 'Noch nichts eingetragen. Suche oben nach einem Lebensmittel oder scanne einen Barcode.'}
                {tab === 'favorites' && 'Markiere Lebensmittel mit dem Stern, um sie hier schnell wiederzufinden.'}
                {tab === 'custom' && 'Du hast noch keine eigenen Lebensmittel erstellt.'}
                {tab === 'recipes' && 'Du hast noch keine Rezepte erstellt.'}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {tabList.map((f) => (
                  <FoodRow key={foodKey(f)} food={f} onPick={onPick} onQuickAdd={onQuickAdd} />
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          {localResults.length > 0 && (
            <div className="mt-4 rounded-3xl bg-surface px-4 shadow-card">
              <ul className="divide-y divide-line">
                {localResults.map((f) => (
                  <FoodRow key={foodKey(f)} food={f} onPick={onPick} onQuickAdd={onQuickAdd} />
                ))}
              </ul>
            </div>
          )}

          <div className="mb-2 mt-5 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
            <Globe className="size-4" />
            Produkte · Open Food Facts
            {onlineState === 'loading' && <Spinner className="ml-auto size-4" />}
          </div>
          <div className="rounded-3xl bg-surface px-4 shadow-card">
            {onlineState === 'idle' && q.length < 3 && <p className="py-6 text-center text-sm text-ink-3">Mindestens 3 Zeichen eingeben, um Markenprodukte zu finden.</p>}
            {onlineState === 'loading' && onlineMerged.length === 0 && (
              <div className="space-y-3 py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3">
                    <div className="size-11 rounded-2xl bg-surface-2" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 rounded bg-surface-2" />
                      <div className="h-3 w-1/3 rounded bg-surface-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onlineState === 'error' && (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-ink-3">
                <WifiOff className="size-5" />
                <span>{onlineError}</span>
                <button type="button" className="font-semibold text-brand" onClick={() => { lastSearched.current = ''; runOnline(q) }}>
                  Erneut versuchen
                </button>
              </div>
            )}
            {onlineState === 'done' && onlineMerged.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Keine weiteren Produkte gefunden.</p>}
            {onlineMerged.length > 0 && (
              <ul className="divide-y divide-line">
                {onlineMerged.map((f) => (
                  <FoodRow key={foodKey(f)} food={f} onPick={onPick} onQuickAdd={onQuickAdd} />
                ))}
              </ul>
            )}
          </div>
          {localResults.length === 0 && onlineState === 'done' && onlineMerged.length === 0 && actions && <div className="mt-4">{actions}</div>}
        </>
      )}
    </div>
  )
}
