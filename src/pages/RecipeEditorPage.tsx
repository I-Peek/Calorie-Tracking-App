import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Plus, Trash, X } from 'lucide-react'
import { db } from '../db/db'
import type { Food, RecipeIngredient } from '../db/types'
import { deleteFood, upsertFood } from '../db/repo'
import { recipePer100, scaleNutrients, sumNutrients } from '../lib/nutrition'
import { fmtGrams, fmtInt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Field, IconButton, MacroDot, NumberInput, TextInput } from '../components/ui'
import { Sheet } from '../components/ui/Sheet'
import { FoodSearch } from '../components/FoodSearch'
import { FoodAmountSheet, defaultAmount } from '../components/FoodAmountSheet'
import { useToast } from '../components/ui/Toast'

export function RecipeEditorPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const toast = useToast()

  const [loaded, setLoaded] = useState<Food>()
  const [name, setName] = useState('')
  const [portions, setPortions] = useState<number | undefined>(2)
  const [cookedWeight, setCookedWeight] = useState<number | undefined>()
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<Food>()
  const [editIndex, setEditIndex] = useState<number>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!editId) return
    void db.foods.get(editId).then((f) => {
      if (!f || f.source !== 'recipe') return
      setLoaded(f)
      setName(f.name)
      setPortions(f.portions ?? 1)
      setIngredients(f.ingredients ?? [])
      const rawWeight = (f.ingredients ?? []).reduce((a, i) => a + i.grams, 0)
      const total = (f.servings[0]?.amount ?? 0) * (f.portions ?? 1)
      if (total > 0 && Math.abs(total - rawWeight) > 1) setCookedWeight(Math.round(total))
    })
  }, [editId])

  const rawWeight = ingredients.reduce((a, i) => a + i.grams, 0)
  const weight = cookedWeight && cookedWeight > 0 ? cookedWeight : rawWeight
  const total = useMemo(() => sumNutrients(ingredients.map((i) => scaleNutrients(i.per100, i.grams))), [ingredients])
  const p = portions && portions > 0 ? portions : 1
  const perPortion = scaleNutrients(total, 100 / p)

  const valid = name.trim().length > 0 && ingredients.length > 0 && weight > 0

  const save = async () => {
    if (!valid) return
    const food: Food = {
      ...(loaded ?? { source: 'recipe', createdAt: Date.now() }),
      source: 'recipe',
      name: name.trim(),
      baseUnit: 'g',
      per100: recipePer100(ingredients, weight),
      servings: [{ label: '1 Portion', amount: Math.round((weight / p) * 10) / 10 }],
      ingredients,
      portions: p,
      updatedAt: Date.now(),
    }
    await upsertFood(food)
    toast.show(editId ? 'Rezept gespeichert' : 'Rezept erstellt')
    navigate(-1)
  }

  const editing = editIndex !== undefined ? ingredients[editIndex] : undefined
  const editingFood: Food | undefined = editing
    ? { id: editing.foodId, source: 'custom', name: editing.name, brand: editing.brand, baseUnit: editing.baseUnit, per100: editing.per100, servings: [], createdAt: 0 }
    : undefined

  return (
    <div className="pb-8">
      <PageHeader
        back
        title={editId ? 'Rezept bearbeiten' : 'Neues Rezept'}
        right={
          editId ? (
            <IconButton label="Rezept löschen" className="text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash className="size-5" />
            </IconButton>
          ) : undefined
        }
      />

      <Card className="space-y-4">
        <Field label="Name des Rezepts *">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Overnight Oats" maxLength={100} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Portionen">
            <NumberInput value={portions} onChange={setPortions} decimals={1} />
          </Field>
          <Field label="Gewicht gekocht" hint={`Optional · roh ${fmtInt(rawWeight)} g`}>
            <NumberInput value={cookedWeight} onChange={setCookedWeight} suffix="g" decimals={0} placeholder={fmtInt(rawWeight)} />
          </Field>
        </div>
      </Card>

      <div className="mb-2 mt-6 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Zutaten</h2>
        <span className="text-sm text-ink-3 tnum">{ingredients.length}</span>
      </div>
      <Card className="p-0">
        {ingredients.length > 0 && (
          <ul className="divide-y divide-line px-4">
            {ingredients.map((i, idx) => (
              <li key={idx} className="flex items-center gap-2 py-2.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditIndex(idx)}>
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="text-xs text-ink-3 tnum">
                    {fmtGrams(i.grams)} {i.baseUnit} · {fmtInt((i.per100.kcal * i.grams) / 100)} kcal
                  </span>
                </button>
                <IconButton label="Zutat entfernen" onClick={() => setIngredients((l) => l.filter((_, j) => j !== idx))}>
                  <X className="size-5" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <div className="p-4">
          <Button variant="soft" block icon={<Plus className="size-5" />} onClick={() => setPicker(true)}>
            Zutat hinzufügen
          </Button>
        </div>
      </Card>

      {ingredients.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Pro Portion</h2>
          <Card>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tnum">{fmtInt(perPortion.kcal)} <span className="text-base font-semibold text-ink-3">kcal</span></span>
              <span className="text-sm text-ink-3 tnum">{fmtInt(weight / p)} g · gesamt {fmtInt(total.kcal)} kcal</span>
            </div>
            <div className="mt-3 flex gap-4 text-sm tnum">
              <span className="flex items-center gap-1.5"><MacroDot color="var(--color-carbs)" />{fmtGrams(perPortion.carbs)} g KH</span>
              <span className="flex items-center gap-1.5"><MacroDot color="var(--color-protein)" />{fmtGrams(perPortion.protein)} g Eiweiß</span>
              <span className="flex items-center gap-1.5"><MacroDot color="var(--color-fat)" />{fmtGrams(perPortion.fat)} g Fett</span>
            </div>
          </Card>
        </>
      )}

      <Button size="lg" block className="mt-6" disabled={!valid} onClick={save}>
        {editId ? 'Speichern' : 'Rezept speichern'}
      </Button>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Zutat hinzufügen" full>
        <FoodSearch excludeRecipes onPick={setPicked} />
      </Sheet>

      <FoodAmountSheet
        open={!!picked}
        food={picked}
        onClose={() => setPicked(undefined)}
        showMeal={false}
        initial={picked ? defaultAmount(picked) : undefined}
        confirmLabel="Zutat hinzufügen"
        onConfirm={(r) => {
          if (!picked) return
          setIngredients((l) => [...l, { foodId: picked.id, name: picked.name, brand: picked.brand, grams: r.grams, baseUnit: picked.baseUnit, per100: picked.per100 }])
          setPicked(undefined)
          setPicker(false)
        }}
      />

      <FoodAmountSheet
        open={!!editingFood}
        food={editingFood}
        onClose={() => setEditIndex(undefined)}
        showMeal={false}
        allowFavorite={false}
        initial={editing ? { quantity: editing.grams, unit: editing.baseUnit } : undefined}
        confirmLabel="Übernehmen"
        onDelete={() => {
          setIngredients((l) => l.filter((_, j) => j !== editIndex))
          setEditIndex(undefined)
        }}
        onConfirm={(r) => {
          setIngredients((l) => l.map((x, j) => (j === editIndex ? { ...x, grams: r.grams } : x)))
          setEditIndex(undefined)
        }}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Rezept löschen?">
        <p className="text-ink-2">„{name}“ wird gelöscht. Bereits eingetragene Mahlzeiten bleiben erhalten.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => setConfirmDelete(false)}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={async () => {
              if (editId) await deleteFood(editId)
              setConfirmDelete(false)
              toast.show('Rezept gelöscht')
              navigate(-1)
            }}
          >
            Löschen
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
