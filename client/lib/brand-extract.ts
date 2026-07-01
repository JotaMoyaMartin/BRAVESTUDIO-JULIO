// Known services we can recognise inside free text to suggest content topics.
export const KNOWN_TOPICS = [
  'Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte', 'Color',
  'Mechas', 'Keratina', 'Decoloración', 'Extensiones', 'Peinados',
]

/**
 * Lightweight field extractor so brand profiles feel personalised without a
 * real AI call. Uses simple regex patterns over the free-text input.
 */
export function extractField(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m && m[1]) return m[1].trim().replace(/[.,;]$/, '')
  }
  return null
}

export interface ExtractedBrand {
  salon_name: string | null
  city: string | null
  main_services: string[] | null
  service_to_promote: string | null
  content_topics: string[] | null
  optimized_summary: string
}

/**
 * Builds a partial brand profile from free text. `optimized_summary` is the
 * raw text trimmed (so the AI prompt has the full context). `salon_name` is
 * best-effort — callers should treat null as "not detected" and ask the user.
 */
export function buildProfile(text: string): ExtractedBrand {
  const lower = text.toLowerCase()
  const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length > 0) || ''

  const salon = extractField(text, [
    /(?:salón|salon|peluquer[ií]a|centro|estudio)\s+(?:se llama\s+)?["“]?([A-ZÁÉÍÓÚÑa-záéíóúñ0-9&'\s]{2,40})["”]?/,
    /me llamo\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,30})/i,
  ]) || (firstLine.length <= 40 ? firstLine : null)

  const city = extractField(text, [
    /(?:en|ciudad de|estoy en|ubicad[oa] en)\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]{2,25})/,
  ])

  const topics = KNOWN_TOPICS.filter(t => lower.includes(t.toLowerCase()))

  return {
    salon_name: salon,
    city,
    main_services: topics.length ? topics.slice(0, 3) : null,
    service_to_promote: topics[0] || null,
    content_topics: topics.length ? topics : null,
    optimized_summary: text.trim(),
  }
}