/**
 * Server-side AI call to Ollama cloud. Mirrors the pattern in appcarrusel/lib/ai/server.ts
 * and brave-studio/client/lib/ai/server-generate.ts.
 *
 * If AI_PROVIDER !== 'ollama' or AI_API_KEY is missing, returns null so the
 * caller falls back to a mock that still follows the BRÄVE manual structure.
 */
export async function generateAIServer(
  prompt: string,
  images?: string[]
): Promise<string | null> {
  const apiKey = process.env.AI_API_KEY
  const provider = process.env.AI_PROVIDER ?? 'ollama'
  if (provider !== 'ollama' || !apiKey) return null

  const baseUrl = process.env.OLLAMA_API_URL ?? 'https://api.ollama.com'
  // Vision-capable model is only needed when we actually pass images.
  const model = images && images.length > 0
    ? (process.env.AI_VISION_MODEL ?? 'gemma3:12b')
    : (process.env.AI_MODEL ?? 'deepseek-v4-flash')

  try {
    const body: any = {
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }
    // Ollama supports inline base64 images via the `images` field on the message.
    // Strip the data: prefix so Ollama gets pure base64.
    if (images && images.length > 0) {
      body.messages = [{
        role: 'user',
        content: prompt,
        images: images.map(img => img.replace(/^data:[^;]+;base64,/, '')),
      }]
    }

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.message?.content ?? null
  } catch {
    return null
  }
}

/**
 * Extract JSON from a noisy LLM output. Handles ```json fences and loose JSON.
 */
export function extractJSON<T>(text: string): T | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.search(/[\[{]/)
  if (start === -1) return null
  const open = candidate[start]
  const close = open === '{' ? '}' : ']'
  let end = candidate.length - 1
  let depth = 0
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++
    else if (candidate[i] === close) {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  const slice = candidate.slice(start, end + 1)
  try { return JSON.parse(slice) as T } catch { return null }
}