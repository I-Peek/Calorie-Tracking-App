import { useEffect, useId, useRef, useState } from 'react'
import { parseISODate, formatDayMonthShort } from '../lib/dates'
import { fmt1, fmtInt } from '../lib/format'

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

export interface BarDatum {
  key: string
  label: string
  value: number
  highlight?: boolean
}

export function BarChart({
  data,
  goal,
  height = 180,
  color = 'var(--color-brand)',
  colorFor,
  unit = '',
}: {
  data: BarDatum[]
  goal?: number
  height?: number
  color?: string
  colorFor?: (d: BarDatum) => string
  unit?: string
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const padL = 36
  const padB = 22
  const padT = 10
  const chartH = height - padB - padT
  const maxVal = niceMax(Math.max(goal ? goal * 1.15 : 0, ...data.map((d) => d.value), 1))
  const innerW = Math.max(0, width - padL)
  const slot = data.length > 0 ? innerW / data.length : 0
  const barW = Math.max(3, Math.min(28, slot * 0.62))
  const y = (v: number) => padT + chartH - (v / maxVal) * chartH
  const ticks = [0, maxVal / 2, maxVal]
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 34)))

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Balkendiagramm">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--color-ink-3)">
                {fmtInt(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2
            const h = Math.max(d.value > 0 ? 2 : 0, chartH - (y(d.value) - padT))
            const fill = colorFor ? colorFor(d) : color
            return (
              <g key={d.key}>
                <title>{`${d.label}: ${fmtInt(d.value)}${unit ? ` ${unit}` : ''}`}</title>
                <rect x={cx - barW / 2} y={padT + chartH - h} width={barW} height={h} rx={Math.min(6, barW / 2)} fill={fill} opacity={d.value > 0 ? 1 : 0.2} />
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fontWeight={d.highlight ? 700 : 400} fill={d.highlight ? 'var(--color-ink)' : 'var(--color-ink-3)'}>
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
          {goal !== undefined && goal > 0 && (
            <g>
              <line x1={padL} x2={width} y1={y(goal)} y2={y(goal)} stroke="var(--color-ink-2)" strokeWidth={1.5} strokeDasharray="4 4" />
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

export interface LinePoint {
  date: string
  value: number
}

export function LineChart({ points, goal, height = 200, color = 'var(--color-brand)', unit = 'kg' }: { points: LinePoint[]; goal?: number; height?: number; color?: string; unit?: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const gradId = useId().replace(/:/g, '')
  const padL = 40
  const padR = 12
  const padT = 14
  const padB = 24
  const chartH = height - padT - padB
  const chartW = Math.max(0, width - padL - padR)

  if (points.length === 0) {
    return <div ref={ref} className="w-full" style={{ height }} />
  }

  const times = points.map((p) => parseISODate(p.date).getTime())
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const values = points.map((p) => p.value)
  const withGoal = goal !== undefined ? [...values, goal] : values
  let minV = Math.min(...withGoal)
  let maxV = Math.max(...withGoal)
  const pad = Math.max(0.5, (maxV - minV) * 0.15)
  minV = Math.floor(minV - pad)
  maxV = Math.ceil(maxV + pad)

  const x = (t: number) => padL + (maxT === minT ? chartW / 2 : ((t - minT) / (maxT - minT)) * chartW)
  const y = (v: number) => padT + chartH - ((v - minV) / (maxV - minV)) * chartH
  const coords = points.map((p, i) => [x(times[i]), y(p.value)] as const)
  const path = coords.map(([cx, cy], i) => `${i === 0 ? 'M' : 'L'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ')
  const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${padT + chartH} L${coords[0][0].toFixed(1)},${padT + chartH} Z`
  const ticks = [minV, (minV + maxV) / 2, maxV]
  const last = coords[coords.length - 1]

  const xLabels = points.length === 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Verlauf">
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--color-ink-3)">
                {fmt1(t)}
              </text>
            </g>
          ))}
          {goal !== undefined && (
            <g>
              <line x1={padL} x2={width - padR} y1={y(goal)} y2={y(goal)} stroke="var(--color-brand-strong)" strokeDasharray="5 4" strokeWidth={1.5} />
              <text x={width - padR} y={y(goal) - 5} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--color-brand-strong)">
                Ziel {fmt1(goal)} {unit}
              </text>
            </g>
          )}
          {points.length > 1 && <path d={area} fill={`url(#${gradId})`} />}
          <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 45 &&
            coords.map(([cx, cy], i) => (
              <circle key={points[i].date} cx={cx} cy={cy} r={3} fill="var(--color-surface)" stroke={color} strokeWidth={2}>
                <title>{`${formatDayMonthShort(points[i].date)}: ${fmt1(points[i].value)} ${unit}`}</title>
              </circle>
            ))}
          <circle cx={last[0]} cy={last[1]} r={5} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
          {xLabels.map((i) => (
            <text key={i} x={coords[i][0]} y={height - 6} fontSize={10} fill="var(--color-ink-3)" textAnchor={i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle'}>
              {formatDayMonthShort(points[i].date)}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
