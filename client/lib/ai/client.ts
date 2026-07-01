/**
 * Client-side helper for LLM content generation.
 *
 * The browser NEVER talks to the LLM provider directly — it calls our own
 * server route `/api/ai/generate`, which holds the Ollama API key and proxies
 * the request server-side. This keeps the key out of the bundle.
 *
 * If the server route is not configured (503) or errors, callers should fall
 * back to the local mock generators (see `lib/ai/prompts/*`).
 */

/**
 * Calls the server AI route with a built prompt and returns the raw model text.
 * Throws on any non-200 response so callers can fall back to mock.
 */
export async function generateAIContent(prompt: string, opts: { signal?: AbortSignal } = {}): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: opts.signal,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`AI route ${res.status}: ${detail.slice(0, 120)}`)
  }

  const data = await res.json()
  const content = data?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI route returned empty content')
  }
  return content
}

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