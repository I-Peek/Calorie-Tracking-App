import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem('theme')
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

const ThemeContext = createContext<[ThemePref, (p: ThemePref) => void]>(['system', () => {}])

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(readPref)
  useEffect(() => {
    apply(pref)
    try {
      localStorage.setItem('theme', pref)
    } catch {
      /* ignore */
    }
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
  return <ThemeContext.Provider value={[pref, setPref]}>{children}</ThemeContext.Provider>
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  return useContext(ThemeContext)
}
