import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Plus, ScanBarcode, Trash, X } from 'lucide-react'
import { db } from '../db/db'
import type { BaseUnit, Food, Nutrients, Serving } from '../db/types'
import { deleteFood, upsertFood } from '../db/repo'
import { kcalFromMacros } from '../lib/nutrition'
import { fmtInt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Field, IconButton, NumberInput, Segmented, TextInput } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { Sheet } from '../components/ui/Sheet'

type NutrientForm = Partial<Record<keyof Nutrients, number>>

export function FoodEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const editId = id ? Number(id) : undefined

  const [loaded, setLoaded] = useState<Food>()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState(params.get('barcode') ?? '')
  const [unit, setUnit] = useState<BaseUnit>('g')
  const [n, setN] = useState<NutrientForm>({})
  const [servings, setServings] = useState<{ label: string; amount?: number }[]>([])
  const [scan, setScan] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!editId) return
    void db.foods.get(editId).then((f) => {
      if (!f) return
      setLoaded(f)
      setName(f.name)
      setBrand(f.brand ?? '')
      setBarcode(f.barcode ?? '')
      setUnit(f.baseUnit)
      setN({ ...f.per100 })
      setServings(f.servings.map((s) => ({ ...s })))
    })
  }, [editId])

  const set = (k: keyof Nutrients) => (v: number | undefined) => setN((x) => ({ ...x, [k]: v }))
  const macroKcal = kcalFromMacros(n.protein ?? 0, n.carbs ?? 0, n.fat ?? 0)
  const kcal = n.kcal ?? (macroKcal > 0 ? Math.round(macroKcal) : undefined)
  const valid = name.trim().length > 0 && kcal !== undefined && kcal >= 0 && (n.carbs ?? 0) <= 100 && (n.protein ?? 0) <= 100 && (n.fat ?? 0) <= 100

  const save = async () => {
    if (!valid || kcal === undefined) return
    const per100: Nutrients = { kcal, protein: n.protein ?? 0, carbs: n.carbs ?? 0, fat: n.fat ?? 0 }
    for (const k of ['sugar', 'fiber', 'saturatedFat', 'salt'] as const) if (n[k] !== undefined) per100[k] = n[k]
    const cleanServings: Serving[] = servings.filter((s) => s.label.trim() && (s.amount ?? 0) > 0).map((s) => ({ label: s.label.trim(), amount: s.amount! }))
    const code = barcode.replace(/\D/g, '') || undefined
    const food: Food = {
      ...(loaded ?? { source: 'custom', createdAt: Date.now() }),
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: code,
      sourceKey: loaded && loaded.source !== 'custom' ? loaded.sourceKey : code,
      baseUnit: unit,
      per100,
      servings: cleanServings,
      updatedAt: Date.now(),
    }
    const newId = await upsertFood(food)
    toast.show(editId ? 'Lebensmittel gespeichert' : 'Lebensmittel erstellt')
    const meal = params.get('meal')
    const date = params.get('date')
    if (!editId && meal && date) navigate(`/add?meal=${meal}&date=${date}&open=${newId}`, { replace: true })
    else navigate(-1)
  }

  return (
    <div className="pb-8">
      <PageHeader
        back
        title={editId ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel'}
        right={
          editId ? (
            <IconButton label="Löschen" onClick={() => setConfirmDelete(true)} className="text-danger">
              <Trash className="size-5" />
            </IconButton>
          ) : undefined
        }
      />

      <Card className="space-y-4">
        <Field label="Name *">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Protein-Pudding Schoko" maxLength={100} autoFocus={!editId} />
        </Field>
        <Field label="Marke">
          <TextInput value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="optional" maxLength={60} />
        </Field>
        <Field label="Barcode (EAN)">
          <div className="flex gap-2">
            <TextInput value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" placeholder="optional" />
            <IconButton label="Barcode scannen" variant="secondary" className="size-12 rounded-2xl" onClick={() => setScan(true)}>
              <ScanBarcode className="size-5" />
            </IconButton>
          </div>
        </Field>
        <Field label="Nährwerte angegeben pro">
          <Segmented value={unit} onChange={setUnit} options={[{ value: 'g', label: '100 g' }, { value: 'ml', label: '100 ml' }]} />
        </Field>
      </Card>

      <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Nährwerte pro 100 {unit}</h2>
      <Card className="space-y-3">
        <Field label="Energie *" hint={n.kcal === undefined && macroKcal > 0 ? `Aus Makros berechnet: ${fmtInt(macroKcal)} kcal` : 'Steht auf der Verpackung unter „Brennwert“.'}>
          <NumberInput value={n.kcal} onChange={set('kcal')} suffix="kcal" decimals={0} placeholder="0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fett">
            <NumberInput value={n.fat} onChange={set('fat')} suffix="g" placeholder="0" />
          </Field>
          <Field label="davon gesättigt">
            <NumberInput value={n.saturatedFat} onChange={set('saturatedFat')} suffix="g" placeholder="–" />
          </Field>
          <Field label="Kohlenhydrate">
            <NumberInput value={n.carbs} onChange={set('carbs')} suffix="g" placeholder="0" />
          </Field>
          <Field label="davon Zucker">
            <NumberInput value={n.sugar} onChange={set('sugar')} suffix="g" placeholder="–" />
          </Field>
          <Field label="Ballaststoffe">
            <NumberInput value={n.fiber} onChange={set('fiber')} suffix="g" placeholder="–" />
          </Field>
          <Field label="Eiweiß">
            <NumberInput value={n.protein} onChange={set('protein')} suffix="g" placeholder="0" />
          </Field>
          <Field label="Salz">
            <NumberInput value={n.salt} onChange={set('salt')} suffix="g" placeholder="–" decimals={2} />
          </Field>
        </div>
      </Card>

      <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Portionen</h2>
      <Card className="space-y-3">
        {servings.length === 0 && <p className="text-sm text-ink-3">Füge Portionsgrößen hinzu, z. B. „1 Riegel“ = 45 g, damit du schneller eintragen kannst.</p>}
        {servings.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput
              value={s.label}
              onChange={(e) => setServings((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              placeholder="z. B. 1 Riegel"
              className="flex-[1.4]"
            />
            <NumberInput
              value={s.amount}
              onChange={(v) => setServings((l) => l.map((x, j) => (j === i ? { ...x, amount: v } : x)))}
              suffix={unit}
              className="flex-1"
            />
            <IconButton label="Portion entfernen" onClick={() => setServings((l) => l.filter((_, j) => j !== i))}>
              <X className="size-5" />
            </IconButton>
          </div>
        ))}
        <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setServings((l) => [...l, { label: '', amount: undefined }])}>
          Portion hinzufügen
        </Button>
      </Card>

      <Button size="lg" block className="mt-6" disabled={!valid} onClick={save}>
        {editId ? 'Speichern' : 'Lebensmittel speichern'}
      </Button>

      <BarcodeScanner
        open={scan}
        onClose={() => setScan(false)}
        onDetected={(c) => {
          setBarcode(c)
          setScan(false)
        }}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Lebensmittel löschen?">
        <p className="text-ink-2">„{name}“ wird aus deinen Lebensmitteln entfernt. Bereits eingetragene Mahlzeiten bleiben erhalten.</p>
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
              toast.show('Lebensmittel gelöscht')
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
