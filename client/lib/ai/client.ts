/**
 * Client-side helper for LLM content generation.
 *
 * The browser NEVER talks to the LLM provider directly — it calls our own
 * server route `/api/ai/generate`, which holds the Ollama API key and proxies
 * the request server-side. This keeps the key out of the bundle.
 *
 * If the server route is not configured (503) or errors, callers should fall
 * back to the local mock generators (see `lib/ai/prompts/*`).
 *
 * extractJSON vive en lib/ai/extract.ts (implementación canónica
 * compartida con server y team) — se re-exporta por compatibilidad.
 */
export { extractJSON } from './extract'

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