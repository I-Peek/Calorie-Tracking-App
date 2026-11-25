import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChefHat, ChevronRight, PencilLine, Plus, Star } from 'lucide-react'
import { db } from '../db/db'
import type { Food } from '../db/types'
import { toggleFavorite } from '../db/repo'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Empty, IconButton, Segmented } from '../components/ui'
import { FoodAvatar } from '../components/FoodAvatar'
import { servingSummary } from '../components/FoodSearch'
import { fmtInt } from '../lib/format'

type Tab = 'custom' | 'recipe' | 'favorites'

export function MyFoodsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('custom')
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? []

  const list = foods
    .filter((f) => (tab === 'favorites' ? f.favorite === 1 : f.source === tab))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const open = (f: Food) => {
    if (f.source === 'recipe') navigate(`/recipe/${f.id}`)
    else if (f.source !== 'builtin') navigate(`/food/${f.id}`)
  }

  return (
    <div>
      <PageHeader back title="Meine Lebensmittel" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'custom', label: 'Eigene' },
          { value: 'recipe', label: 'Rezepte' },
          { value: 'favorites', label: 'Favoriten' },
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<PencilLine className="size-4" />} onClick={() => navigate('/food/new')}>
          Lebensmittel
        </Button>
        <Button variant="secondary" icon={<ChefHat className="size-4" />} onClick={() => navigate('/recipe/new')}>
          Rezept
        </Button>
      </div>
      <Card className="mt-3 p-0">
        {list.length === 0 ? (
          <Empty
            icon={tab === 'recipe' ? <ChefHat className="size-6" /> : tab === 'favorites' ? <Star className="size-6" /> : <Plus className="size-6" />}
            title={tab === 'recipe' ? 'Noch keine Rezepte' : tab === 'favorites' ? 'Noch keine Favoriten' : 'Noch keine eigenen Lebensmittel'}
            text={
              tab === 'recipe'
                ? 'Kombiniere Zutaten zu einem Rezept und trage Portionen mit einem Tipp ein.'
                : tab === 'favorites'
                  ? 'Tippe in der Detailansicht eines Lebensmittels auf den Stern.'
                  : 'Lege Produkte an, die nicht in der Datenbank sind – z. B. vom Bäcker um die Ecke.'
            }
          />
        ) : (
          <ul className="divide-y divide-line px-4">
            {list.map((f) => {
              const s = servingSummary(f)
              return (
                <li key={f.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => open(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <FoodAvatar food={f} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{f.name}</span>
                      <span className="block truncate text-sm text-ink-3">
                        {[f.brand, s.label].filter(Boolean).join(' · ')} · {fmtInt(s.kcal)} kcal
                      </span>
                    </span>
                  </button>
                  {tab === 'favorites' ? (
                    <IconButton label="Aus Favoriten entfernen" className="text-amber-500" onClick={() => void toggleFavorite(f)}>
                      <Star className="size-5" fill="currentColor" />
                    </IconButton>
                  ) : (
                    <ChevronRight className="size-5 text-ink-3" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
