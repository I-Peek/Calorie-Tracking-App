import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { todayISO } from '../lib/dates'

interface Ctx {
  date: string
  setDate: (d: string) => void
}

const SelectedDateContext = createContext<Ctx>({ date: todayISO(), setDate: () => {} })

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(todayISO())
  const [today, setToday] = useState(todayISO())

  // When the app is reopened on a new day, jump to the new "today" if the user was looking at the old today.
  useEffect(() => {
    const check = () => {
      const t = todayISO()
      if (t !== today) {
        setDate((d) => (d === today ? t : d))
        setToday(t)
      }
    }
    const onVis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVis)
    const id = window.setInterval(check, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(id)
    }
  }, [today])

  return <SelectedDateContext.Provider value={{ date, setDate }}>{children}</SelectedDateContext.Provider>
}

export function useSelectedDate(): Ctx {
  return useContext(SelectedDateContext)
}
