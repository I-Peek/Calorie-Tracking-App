import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { parseDecimal, toInputValue } from '../../lib/format'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-strong shadow-sm shadow-brand/30',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3 border border-line',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
  soft: 'bg-brand-soft text-brand-strong dark:text-brand hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  variant = 'ghost',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: 'ghost' | 'soft' | 'secondary' | 'primary' | 'plain' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        variant === 'soft' && 'bg-brand-soft text-brand-strong dark:text-brand',
        variant === 'secondary' && 'bg-surface-2 text-ink hover:bg-surface-3',
        variant === 'primary' && 'bg-brand text-on-brand hover:bg-brand-strong',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------- Card ----------

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('rounded-3xl bg-surface p-4 shadow-card', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
      {action}
    </div>
  )
}

// ---------- Progress ----------

export function Ring({
  value,
  max,
  size = 180,
  stroke = 14,
  color = 'var(--color-brand)',
  track = 'var(--color-surface-3)',
  overColor = 'var(--color-danger)',
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  overColor?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? value / max : 0
  const over = ratio > 1
  const pct = Math.min(1, Math.max(0, ratio))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? overColor : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.9,.3,1), stroke 300ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function ProgressBar({ value, max, color = 'var(--color-brand)', className, height = 8 }: { value: number; max: number; color?: string; className?: string; height?: number }) {
  const ratio = max > 0 ? value / max : 0
  const over = ratio > 1.0001
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-surface-3', className)} style={{ height }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
          background: over ? 'var(--color-danger)' : color,
          transition: 'width 500ms cubic-bezier(.2,.9,.3,1)',
        }}
      />
    </div>
  )
}

// ---------- Segmented ----------

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" className={cx('flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-xl px-2 font-semibold transition',
              size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm',
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------- Form fields ----------

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block px-1 text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="px-1 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-ink placeholder:text-ink-3 outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...props} className={cx(inputClass, props.className)} />
}

export function NumberInput({
  value,
  onChange,
  suffix,
  decimals = 1,
  className,
  id,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number | undefined
  onChange: (v: number | undefined) => void
  suffix?: ReactNode
  decimals?: number
}) {
  const [text, setText] = useState(() => toInputValue(value, decimals))
  useEffect(() => {
    const parsed = parseDecimal(text)
    const same = (value === undefined && text.trim() === '') || (value !== undefined && Math.abs(parsed - value) < 1e-9)
    if (!same) setText(toInputValue(value, decimals))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals])
  const autoId = useId()
  return (
    <div className={cx('relative', className)}>
      <input
        id={id ?? autoId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...rest}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,]/g, '')
          setText(t)
          const n = parseDecimal(t)
          onChange(t.trim() === '' || Number.isNaN(n) ? undefined : n)
        }}
        onFocus={(e) => {
          e.target.select()
          rest.onFocus?.(e)
        }}
        className={cx(inputClass, 'tnum', suffix ? 'pr-14' : '')}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-3">{suffix}</span>}
    </div>
  )
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(inputClass, 'appearance-none bg-[length:16px] pr-10', className)}>
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-4 py-3 text-left">
      <span className="flex-1">
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-3">{description}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-surface-3')}>
        <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

// ---------- Misc ----------

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('animate-spin text-ink-3', className ?? 'size-5')} />
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-3">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-ink-3">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const NUTRI_COLORS: Record<string, string> = {
  a: '#038141',
  b: '#85bb2f',
  c: '#fecb02',
  d: '#ee8100',
  e: '#e63e11',
}

export function NutriScore({ grade, size = 'sm' }: { grade?: string; size?: 'sm' | 'md' }) {
  if (!grade || !NUTRI_COLORS[grade]) return null
  return (
    <span
      title={`Nutri-Score ${grade.toUpperCase()}`}
      className={cx('inline-flex items-center justify-center rounded-md font-extrabold uppercase text-white', size === 'sm' ? 'h-5 min-w-5 px-1 text-[11px]' : 'h-7 min-w-7 px-1.5 text-sm')}
      style={{ background: NUTRI_COLORS[grade], color: grade === 'c' ? '#3b2f00' : '#fff' }}
    >
      {grade}
    </span>
  )
}

export function MacroDot({ color }: { color: string }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />
}
