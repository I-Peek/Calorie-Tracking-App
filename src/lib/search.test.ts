import { describe, expect, it } from 'vitest'
import { matchScore, normalize } from './search'

describe('search', () => {
  it('normalizes umlauts and punctuation', () => {
    expect(normalize('Hähnchen-Brust (gebraten)')).toBe('hahnchen brust gebraten')
    expect(normalize('Süßkartoffel')).toBe('susskartoffel')
  })

  it('requires all tokens', () => {
    expect(matchScore('apfel saft', 'Apfelsaft')).toBeGreaterThan(0)
    expect(matchScore('apfel xyz', 'Apfelsaft')).toBe(0)
  })

  it('ranks exact and prefix matches higher', () => {
    const exact = matchScore('apfel', 'Apfel')
    const prefix = matchScore('apfel', 'Apfelkuchen')
    const inner = matchScore('apfel', 'Bratapfel')
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(inner)
  })

  it('matches aliases', () => {
    expect(matchScore('möhre', 'Karotte', 'möhre mohrrübe')).toBeGreaterThan(0)
  })
})
