/** Normalise text for fuzzy matching: lower case, umlauts folded, punctuation removed. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Relevance score of `text` (plus optional extra keywords) for `query`.
 * Returns 0 when not every query token matches.
 */
export function matchScore(query: string, text: string, extra = ''): number {
  const q = normalize(query)
  if (!q) return 0
  const name = normalize(text)
  const all = `${name} ${normalize(extra)}`
  const tokens = q.split(' ')
  const words = all.split(' ')
  let score = 0
  for (const t of tokens) {
    if (words.some((w) => w === t)) score += 30
    else if (words.some((w) => w.startsWith(t))) score += 20
    else if (all.includes(t)) score += 8
    else return 0
  }
  if (name === q) score += 100
  else if (name.startsWith(q)) score += 50
  else if (name.includes(q)) score += 15
  // Prefer shorter (more generic) names.
  score -= Math.min(20, name.length / 4)
  return score
}
