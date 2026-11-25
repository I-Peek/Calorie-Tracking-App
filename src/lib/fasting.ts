export interface FastingPlan {
  key: string
  label: string
  fastHours: number
  description: string
}

export const FASTING_PLANS: FastingPlan[] = [
  { key: '12:12', label: '12:12', fastHours: 12, description: 'Sanfter Einstieg – 12 Stunden fasten' },
  { key: '14:10', label: '14:10', fastHours: 14, description: 'Leicht – 14 Stunden fasten, 10 Stunden essen' },
  { key: '16:8', label: '16:8', fastHours: 16, description: 'Der Klassiker – 16 Stunden fasten, 8 Stunden essen' },
  { key: '18:6', label: '18:6', fastHours: 18, description: 'Fortgeschritten – 18 Stunden fasten' },
  { key: '20:4', label: '20:4', fastHours: 20, description: 'Intensiv – nur 4 Stunden Essensfenster' },
  { key: '23:1', label: 'OMAD', fastHours: 23, description: 'One Meal A Day – eine Mahlzeit am Tag' },
]

export function planByKey(key: string): FastingPlan {
  return FASTING_PLANS.find((p) => p.key === key) ?? FASTING_PLANS[2]
}

export interface FastingPhase {
  fromHours: number
  title: string
  description: string
}

/** Rough, simplified phases of a fast (orientation only, not medical advice). */
export const FASTING_PHASES: FastingPhase[] = [
  { fromHours: 0, title: 'Verdauung', description: 'Dein Körper verarbeitet die letzte Mahlzeit, der Blutzucker ist erhöht.' },
  { fromHours: 4, title: 'Blutzucker sinkt', description: 'Der Insulinspiegel fällt, der Körper greift auf gespeicherte Energie zurück.' },
  { fromHours: 8, title: 'Glykogen wird genutzt', description: 'Die Kohlenhydratspeicher in Leber und Muskeln werden aufgebraucht.' },
  { fromHours: 12, title: 'Fettverbrennung', description: 'Der Körper stellt zunehmend auf Fettverbrennung um.' },
  { fromHours: 16, title: 'Ketose beginnt', description: 'Aus Fett werden Ketonkörper gebildet – eine wichtige Energiequelle.' },
  { fromHours: 18, title: 'Tiefe Fastenphase', description: 'Ketonkörper steigen weiter, Zellreinigungsprozesse (Autophagie) werden aktiver.' },
]

export function currentPhase(hours: number): FastingPhase {
  let p = FASTING_PHASES[0]
  for (const ph of FASTING_PHASES) if (hours >= ph.fromHours) p = ph
  return p
}
