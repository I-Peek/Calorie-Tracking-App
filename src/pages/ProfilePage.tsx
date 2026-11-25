import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, Database, Download, Monitor, Moon, Smartphone, Sun, Target, Trash, Upload, Utensils, ShieldCheck } from 'lucide-react'
import type { Profile } from '../db/types'
import { useGoals, useWeightOn } from '../hooks/data'
import { useTheme, type ThemePref } from '../hooks/theme'
import { todayISO } from '../lib/dates'
import { GOAL_LABELS, ageFromBirthYear } from '../lib/nutrition'
import { fmt1, fmtInt } from '../lib/format'
import { downloadBackup, parseBackup, restoreBackup, wipeAllData } from '../lib/backup'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, MacroDot, SectionTitle, Segmented, cx } from '../components/ui'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function ProfilePage({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [theme, setTheme] = useTheme()
  const weight = useWeightOn(todayISO(), profile) ?? profile.startWeightKg
  const goals = useGoals(profile, weight)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent>()
  const [installHelp, setInstallHelp] = useState(false)
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const initial = (profile.name?.trim()?.[0] ?? '🙂').toUpperCase()

  const onImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      await restoreBackup(backup)
      toast.show('Sicherung wiederhergestellt')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Import fehlgeschlagen', { tone: 'error' })
    }
  }

  return (
    <div>
      <PageHeader title="Profil" large />

      <Card className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-emerald-700 text-2xl font-extrabold text-white">{initial}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{profile.name || 'Mein Profil'}</div>
          <div className="text-sm text-ink-3">
            {ageFromBirthYear(profile.birthYear)} Jahre · {fmtInt(profile.heightCm)} cm · {fmt1(weight)} kg
          </div>
          <div className="mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-strong dark:text-brand">{GOAL_LABELS[profile.goal]}</div>
        </div>
      </Card>

      <SectionTitle>Tagesziele</SectionTitle>
      <Card className="p-0">
        <button type="button" onClick={() => navigate('/profile/goals')} className="flex w-full items-center gap-3 p-4 text-left">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong dark:text-brand">
            <Target className="size-6" />
          </span>
          <span className="flex-1">
            <span className="block text-2xl font-extrabold tnum">
              {fmtInt(goals?.kcal)} <span className="text-sm font-semibold text-ink-3">kcal</span>
            </span>
            <span className="flex flex-wrap gap-x-3 text-xs text-ink-3 tnum">
              <span className="flex items-center gap-1"><MacroDot color="var(--color-carbs)" />{fmtInt(goals?.macros.carbs)} g KH</span>
              <span className="flex items-center gap-1"><MacroDot color="var(--color-protein)" />{fmtInt(goals?.macros.protein)} g Eiweiß</span>
              <span className="flex items-center gap-1"><MacroDot color="var(--color-fat)" />{fmtInt(goals?.macros.fat)} g Fett</span>
              <span className="flex items-center gap-1"><MacroDot color="var(--color-water)" />{fmt1(profile.waterGoalMl / 1000)} l Wasser</span>
            </span>
          </span>
          <ChevronRight className="size-5 text-ink-3" />
        </button>
      </Card>

      <SectionTitle>Allgemein</SectionTitle>
      <Card className="p-0">
        <ListButton icon={<Target className="size-5" />} label="Ziele & persönliche Daten" onClick={() => navigate('/profile/goals')} />
        <ListButton icon={<Utensils className="size-5" />} label="Meine Lebensmittel & Rezepte" onClick={() => navigate('/foods')} />
        {!standalone && (
          <ListButton
            icon={<Smartphone className="size-5" />}
            label="App auf dem Homescreen installieren"
            onClick={async () => {
              if (installEvent) {
                await installEvent.prompt()
                setInstallEvent(undefined)
              } else setInstallHelp(true)
            }}
          />
        )}
      </Card>

      <SectionTitle>Darstellung</SectionTitle>
      <Card>
        <Segmented<ThemePref>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: <span className="flex items-center justify-center gap-1.5"><Monitor className="size-4" />Auto</span> },
            { value: 'light', label: <span className="flex items-center justify-center gap-1.5"><Sun className="size-4" />Hell</span> },
            { value: 'dark', label: <span className="flex items-center justify-center gap-1.5"><Moon className="size-4" />Dunkel</span> },
          ]}
        />
      </Card>

      <SectionTitle>Daten</SectionTitle>
      <Card className="p-0">
        <ListButton
          icon={<Download className="size-5" />}
          label="Sicherung exportieren"
          sub="Alle Daten als Datei speichern"
          onClick={async () => {
            try {
              const r = await downloadBackup()
              if (r === 'downloaded') toast.show('Sicherung heruntergeladen')
            } catch {
              toast.show('Export fehlgeschlagen', { tone: 'error' })
            }
          }}
        />
        <ListButton icon={<Upload className="size-5" />} label="Sicherung importieren" sub="Ersetzt alle aktuellen Daten" onClick={() => fileRef.current?.click()} />
        <ListButton icon={<Trash className="size-5" />} label="Alle Daten löschen" danger onClick={() => setConfirmWipe(true)} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
      </Card>
      <div className="mt-3 flex gap-3 rounded-2xl bg-surface-2 p-3 text-xs text-ink-3">
        <ShieldCheck className="size-5 shrink-0 text-brand" />
        <p>Deine Daten bleiben privat und werden nur auf diesem Gerät gespeichert. Erstelle regelmäßig eine Sicherung – besonders bevor du das Gerät wechselst oder Browserdaten löschst.</p>
      </div>

      <SectionTitle>Über</SectionTitle>
      <Card className="space-y-2 text-sm text-ink-2">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-ink-3" />
          <span>
            Produktdaten von{' '}
            <a className="font-semibold text-brand" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
              Open Food Facts
            </a>{' '}
            (ODbL)
          </span>
        </div>
        <p className="text-xs text-ink-3">NutriLog v{__APP_VERSION__} · Nährwerte und Empfehlungen dienen der Orientierung und ersetzen keine ärztliche Beratung.</p>
      </Card>

      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Alle Daten löschen?">
        <p className="text-ink-2">Dein Profil, alle Einträge, eigene Lebensmittel, Rezepte, Gewichtsdaten und Fastenzeiten werden unwiderruflich von diesem Gerät gelöscht.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => setConfirmWipe(false)}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={async () => {
              await wipeAllData()
              setConfirmWipe(false)
              navigate('/', { replace: true })
            }}
          >
            Endgültig löschen
          </Button>
        </div>
      </Sheet>

      <Sheet open={installHelp} onClose={() => setInstallHelp(false)} title="App installieren">
        <div className="space-y-4 text-ink-2">
          <div>
            <div className="font-semibold text-ink">iPhone / iPad (Safari)</div>
            <p className="text-sm">Tippe unten auf „Teilen“ (Quadrat mit Pfeil) und wähle „Zum Home-Bildschirm“.</p>
          </div>
          <div>
            <div className="font-semibold text-ink">Android (Chrome)</div>
            <p className="text-sm">Öffne das Menü (⋮) und tippe auf „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>
          </div>
          <p className="text-sm">Danach startet NutriLog wie eine normale App – im Vollbild und auch offline.</p>
        </div>
      </Sheet>
    </div>
  )
}

function ListButton({ icon, label, sub, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 hover:bg-surface-2">
      <span className={cx('flex size-9 items-center justify-center rounded-xl', danger ? 'bg-danger/12 text-danger' : 'bg-surface-2 text-ink-2')}>{icon}</span>
      <span className="flex-1">
        <span className={cx('block font-medium', danger && 'text-danger')}>{label}</span>
        {sub && <span className="block text-xs text-ink-3">{sub}</span>}
      </span>
      <ChevronRight className="size-5 text-ink-3" />
    </button>
  )
}
