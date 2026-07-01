import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy to the Ollama cloud LLM.
 *
 * The API key lives only in server env vars — it is NEVER exposed to the
 * browser. The client calls this route with a prompt; this route forwards it
 * to Ollama and returns the generated text.
 *
 * Expected env vars (Vercel):
 *   AI_PROVIDER   = "ollama"
 *   AI_API_KEY    = <ollama key>
 *   AI_MODEL      = deepseek-v4-flash
 *   OLLAMA_API_URL= https://api.ollama.com
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'deepseek-v4-flash'
  const baseUrl = process.env.OLLAMA_API_URL || 'https://api.ollama.com'
  const provider = process.env.AI_PROVIDER || 'mock'

  if (provider === 'mock' || !apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = body?.prompt
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
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
      // Ollama cloud can take a few seconds to evaluate.
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Ollama ${res.status}`, detail: text.slice(0, 300) },
        { status: 502 }
      )
    }

    const data = await res.json()
    const content = data?.message?.content ?? data?.message?.text ?? ''
    return NextResponse.json({ content })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Ollama request failed', detail: msg }, { status: 502 })
  }
}