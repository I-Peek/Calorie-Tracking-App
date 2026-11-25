import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Square, Trash, Pencil } from 'lucide-react'
import { db } from '../db/db'
import type { FastingSession, Profile } from '../db/types'
import { FASTING_PHASES, FASTING_PLANS, currentPhase, planByKey } from '../lib/fasting'
import { deleteFast, endFast, startFast, updateFast, updateProfile } from '../db/repo'
import { formatDuration, formatTime, relativeDayLabel, toISODate } from '../lib/dates'
import { fmt1 } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Ring, SectionTitle, cx, inputClass } from '../components/ui'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function toLocalInput(ts: number): string {
  const d = new Date(ts)
  return `${toISODate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function FastingPage({ profile }: { profile: Profile }) {
  const sessions = useLiveQuery(() => db.fasting.orderBy('start').reverse().toArray(), []) ?? []
  const active = sessions.find((s) => !s.end)
  const now = useNow()
  const toast = useToast()
  const plan = planByKey(active?.plan ?? profile.fastingPlan)
  const [editStart, setEditStart] = useState(false)
  const [editSession, setEditSession] = useState<FastingSession>()

  const elapsedMs = active ? now - active.start : 0
  const targetMs = (active?.targetHours ?? plan.fastHours) * 3600_000
  const hours = elapsedMs / 3600_000
  const phase = currentPhase(hours)
  const reached = active && elapsedMs >= targetMs

  const completed = sessions.filter((s) => s.end)
  const stats = useMemo(() => {
    const durations = completed.map((s) => (s.end! - s.start) / 3600_000)
    const success = completed.filter((s) => (s.end! - s.start) / 3600_000 >= s.targetHours).length
    return {
      count: completed.length,
      avg: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      longest: durations.length ? Math.max(...durations) : 0,
      success,
    }
  }, [completed])

  const start = async () => {
    await startFast(plan.key, plan.fastHours)
    toast.show(`Fasten gestartet – viel Erfolg! 💪`)
  }
  const stop = async () => {
    if (!active?.id) return
    await endFast(active.id)
    toast.show(reached ? 'Geschafft! Fastenziel erreicht 🎉' : `Fasten beendet nach ${fmt1(hours)} h`)
  }

  return (
    <div>
      <PageHeader title="Intervallfasten" large />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {FASTING_PLANS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={!!active}
            onClick={() => void updateProfile({ fastingPlan: p.key })}
            className={cx(
              'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition disabled:opacity-60',
              plan.key === p.key ? 'bg-ink text-page' : 'bg-surface text-ink-2 shadow-card',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-sm text-ink-3">{plan.description}</p>

      <Card className="mt-4 flex flex-col items-center p-6">
        <Ring value={elapsedMs} max={targetMs} size={250} stroke={16} color={reached ? 'var(--color-brand)' : 'var(--color-protein)'} overColor="var(--color-brand)">
          {active ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">{reached ? 'Ziel erreicht 🎉' : 'Gefastet'}</span>
              <span className="mt-1 text-[40px] font-extrabold leading-none tracking-tight tnum">{formatDuration(elapsedMs)}</span>
              <span className="mt-2 text-sm text-ink-3 tnum">{reached ? `+${formatDuration(elapsedMs - targetMs)}` : `noch ${formatDuration(targetMs - elapsedMs)}`}</span>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">Bereit</span>
              <span className="mt-1 text-[44px] font-extrabold leading-none tracking-tight">{plan.fastHours} h</span>
              <span className="mt-2 text-sm text-ink-3">Fastenziel</span>
            </>
          )}
        </Ring>

        {active && (
          <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
            <button type="button" onClick={() => setEditStart(true)} className="rounded-2xl bg-surface-2 p-3 hover:bg-surface-3">
              <div className="flex items-center justify-center gap-1 text-xs text-ink-3">
                Start <Pencil className="size-3" />
              </div>
              <div className="font-bold tnum">
                {relativeDayLabel(toISODate(new Date(active.start)))}, {formatTime(active.start)}
              </div>
            </button>
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="text-xs text-ink-3">Ziel</div>
              <div className="font-bold tnum">
                {relativeDayLabel(toISODate(new Date(active.start + targetMs)))}, {formatTime(active.start + targetMs)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 w-full">
          {active ? (
            <Button size="lg" block variant={reached ? 'primary' : 'secondary'} icon={<Square className="size-4" fill="currentColor" />} onClick={stop}>
              Fasten beenden
            </Button>
          ) : (
            <Button size="lg" block icon={<Play className="size-4" fill="currentColor" />} onClick={start}>
              Fasten starten
            </Button>
          )}
        </div>
      </Card>

      {active && (
        <>
          <SectionTitle>Aktuelle Phase</SectionTitle>
          <Card>
            <div className="font-bold">{phase.title}</div>
            <p className="mt-1 text-sm text-ink-2">{phase.description}</p>
            <ol className="mt-4 space-y-2">
              {FASTING_PHASES.map((ph) => {
                const done = hours >= ph.fromHours
                return (
                  <li key={ph.fromHours} className="flex items-center gap-3 text-sm">
                    <span className={cx('flex size-6 items-center justify-center rounded-full text-[11px] font-bold', done ? 'bg-protein text-white' : 'bg-surface-3 text-ink-3')}>{ph.fromHours}h</span>
                    <span className={done ? 'font-medium text-ink' : 'text-ink-3'}>{ph.title}</span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-4 text-xs text-ink-3">Vereinfachte Darstellung zur Orientierung – kein medizinischer Rat.</p>
          </Card>
        </>
      )}

      <SectionTitle>Statistik</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Fastentage" value={String(stats.count)} />
        <StatTile label="Ø Dauer" value={`${fmt1(stats.avg)} h`} />
        <StatTile label="Längstes" value={`${fmt1(stats.longest)} h`} />
      </div>

      {completed.length > 0 && (
        <>
          <SectionTitle>Verlauf</SectionTitle>
          <Card className="p-0">
            <ul className="divide-y divide-line px-4">
              {completed.slice(0, 30).map((s) => {
                const h = (s.end! - s.start) / 3600_000
                const ok = h >= s.targetHours
                return (
                  <li key={s.id}>
                    <button type="button" onClick={() => setEditSession(s)} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className={cx('flex size-9 items-center justify-center rounded-full text-sm', ok ? 'bg-brand-soft text-brand-strong dark:text-brand' : 'bg-surface-2 text-ink-3')}>{ok ? '✓' : '–'}</span>
                      <span className="flex-1">
                        <span className="block font-medium">{relativeDayLabel(toISODate(new Date(s.start)))}</span>
                        <span className="text-xs text-ink-3 tnum">
                          {formatTime(s.start)} – {formatTime(s.end!)} · Plan {planByKey(s.plan).label}
                        </span>
                      </span>
                      <span className="font-bold tnum">{fmt1(h)} h</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}

      {active && (
        <EditTimesSheet
          open={editStart}
          onClose={() => setEditStart(false)}
          session={active}
          onSave={async (startTs) => {
            await updateFast(active.id!, { start: startTs })
            setEditStart(false)
          }}
        />
      )}
      {editSession && (
        <EditTimesSheet
          open
          onClose={() => setEditSession(undefined)}
          session={editSession}
          withEnd
          onDelete={async () => {
            await deleteFast(editSession.id!)
            setEditSession(undefined)
            toast.show('Eintrag gelöscht')
          }}
          onSave={async (startTs, endTs) => {
            await updateFast(editSession.id!, { start: startTs, end: endTs })
            setEditSession(undefined)
          }}
        />
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <div className="text-xl font-extrabold tnum">{value}</div>
      <div className="text-xs text-ink-3">{label}</div>
    </Card>
  )
}

function EditTimesSheet({
  open,
  onClose,
  session,
  withEnd,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  session: FastingSession
  withEnd?: boolean
  onSave: (start: number, end?: number) => void
  onDelete?: () => void
}) {
  const [start, setStart] = useState(toLocalInput(session.start))
  const [end, setEnd] = useState(toLocalInput(session.end ?? Date.now()))
  useEffect(() => {
    if (!open) return
    setStart(toLocalInput(session.start))
    setEnd(toLocalInput(session.end ?? Date.now()))
  }, [open, session])
  const startTs = new Date(start).getTime()
  const endTs = new Date(end).getTime()
  const valid = Number.isFinite(startTs) && startTs <= Date.now() && (!withEnd || (Number.isFinite(endTs) && endTs > startTs))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={withEnd ? 'Fastenzeit bearbeiten' : 'Startzeit ändern'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Löschen">
              <Trash className="size-5" />
            </Button>
          )}
          <Button size="lg" block disabled={!valid} onClick={() => onSave(startTs, withEnd ? endTs : undefined)}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block px-1 text-sm font-medium text-ink-2">Beginn</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </label>
        {withEnd && (
          <label className="block">
            <span className="mb-1.5 block px-1 text-sm font-medium text-ink-2">Ende</span>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </label>
        )}
      </div>
    </Sheet>
  )
}
