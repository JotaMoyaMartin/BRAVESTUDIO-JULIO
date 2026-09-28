import { NextRequest, NextResponse } from 'next/server'
import { callLLM, isServerAIConfigured } from '@/lib/ai/llm'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Server-side proxy to the LLM (Ollama cloud).
 *
 * The API key lives only in server env vars — it is NEVER exposed to the
 * browser. The client calls this route with a prompt; this route forwards it
 * to the provider and returns the generated text.
 *
 * Hardening (Fase 0):
 *   - Requiere sesión de Supabase cuando Supabase está configurado
 *     (en modo demo, sin credenciales, se permite sin sesión).
 *   - Rate limit por usuaria (20 req/min) o por IP en demo.
 *   - Límite de tamaño de prompt y timeout en la llamada saliente.
 *
 * Expected env vars (Vercel):
 *   AI_PROVIDER   = "ollama"
 *   AI_API_KEY    = <ollama key>
 *   AI_MODEL      = deepseek-v4-flash
 *   OLLAMA_API_URL= https://api.ollama.com
 */

const MAX_PROMPT_LENGTH = 30_000
const RATE_LIMIT_PER_MINUTE = 20

export async function POST(req: NextRequest) {
  if (!isServerAIConfigured()) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  // ── Auth + rate limit ──────────────────────────────────────────
  const supabaseConfigured = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')
  if (supabaseConfigured) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const rl = rateLimit(`ai:${user.id}`, RATE_LIMIT_PER_MINUTE, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }
  } else {
    // Modo demo (sin Supabase): límite básico por IP para frenar abuso local.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rl = rateLimit(`ai-demo:${ip}`, RATE_LIMIT_PER_MINUTE, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }
  }

  // ── Body ───────────────────────────────────────────────────────
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
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: 'Prompt too long' }, { status: 400 })
  }

  // ── LLM ────────────────────────────────────────────────────────
  try {
    const { content } = await callLLM({ prompt, timeoutMs: 60_000, retries: 1 })
    return NextResponse.json({ content })
  } catch (err) {
    if (err instanceof Error && err.message === 'AI not configured') {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Ollama request failed', detail: msg }, { status: 502 })
  }
}