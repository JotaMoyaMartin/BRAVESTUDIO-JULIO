/**
 * Server-side AI content generation — calls Ollama directly without HTTP hop.
 * Used in server route handlers where fetch('/api/ai/generate') may not work
 * reliably. Shares the same env vars as the /api/ai/generate route.
 */
import { extractJSON } from './client'

export async function serverGenerateAIContent(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'deepseek-v4-flash'
  const baseUrl = process.env.OLLAMA_API_URL || 'https://api.ollama.com'
  const provider = process.env.AI_PROVIDER || 'mock'

  if (provider === 'mock' || !apiKey) {
    throw new Error('AI not configured')
  }

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.message?.content ?? data?.message?.text ?? ''
  if (!content || !content.trim()) {
    throw new Error('Ollama returned empty content')
  }
  return content
}

export { extractJSON }