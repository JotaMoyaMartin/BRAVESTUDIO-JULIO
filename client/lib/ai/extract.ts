/**
 * Extractor de JSON canónico para respuestas de LLM.
 * ÚNICA implementación — reutilizada por cliente, server y team.
 * (Antes existían 3 variantes con semántica distinta; ver docs/ARCHITECTURE.md §5.2)
 */

/**
 * Extracts a JSON object from a model response that may wrap it in
 * ```json ... ``` fences or include surrounding prose. Returns null if no
 * parseable JSON object is found.
 */
export function extractJSON<T = unknown>(text: string): T | null {
  if (!text) return null
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text

  // Find the first balanced {...} or [...].
  const start = candidate.search(/[{[]/)
  if (start === -1) return null
  const open = candidate[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i]
    if (esc) { esc = false; continue }
    if (c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1)
        try {
          return JSON.parse(slice) as T
        } catch {
          return null
        }
      }
    }
  }
  // Fallback: try parsing the whole trimmed candidate.
  try {
    return JSON.parse(candidate.trim()) as T
  } catch {
    return null
  }
}