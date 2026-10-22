import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_BYTES = 20 * 1024 * 1024 // ~12 min de mp3 mono 16k

/**
 * Transcripción de audio (palabras con tiempos) para Editar Videos.
 * Audio ya extraído en el navegador (mp3 mono 16k) — el video completo NUNCA llega aquí.
 * Proveedor: GROQ_API_KEY (whisper-large-v3, rapido) con fallback OPENAI_API_KEY.
 * El coste es de centavos por reel y la key nunca llega al browser.
 */
export async function POST(request: NextRequest) {
  const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')
  if (IS_CONFIGURED) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 })
    const rl = rateLimit(`ev-transcribe-${user.id}`, 20, 60_000)
    if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const audio = await request.blob()
  if (!audio || audio.size === 0) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 })

  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!groqKey && !openaiKey) {
    return NextResponse.json({ error: 'no_key', message: 'Transcripción IA no configurada en el servidor' }, { status: 501 })
  }

  const base = groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1'
  const model = groqKey ? 'whisper-large-v3' : 'whisper-1'
  const key = groqKey ?? openaiKey

  const form = new FormData()
  form.append('file', audio, 'audio.mp3')
  form.append('model', model)
  form.append('response_format', 'verbose_json')
  if (groqKey) form.append('timestamp_granularities[]', 'word')

  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[ev-transcribe]', res.status, detail.slice(0, 300))
    return NextResponse.json({ error: 'provider_error', status: res.status }, { status: 502 })
  }
  const json = await res.json()
  // normalizar a palabras planas
  const words = (json.words ?? [])
    .map((w: { word: string; start: number; end: number }) => ({ text: w.word?.trim(), start: w.start, end: w.end }))
    .filter((w: { text: string }) => w.text)
  if (words.length === 0 && json.text) {
    // sin granularidad de palabra (openai las da; groq también con el flag) — segmentos a palabra por duración repartida
    const segs = (json.segments ?? []) as { text: string; start: number; end: number }[]
    for (const s of segs) {
      const toks = s.text.trim().split(/\s+/).filter(Boolean)
      if (toks.length === 0) continue
      const dur = Math.max(0.05, s.end - s.start) / toks.length
      toks.forEach((t, i) => words.push({ text: t, start: s.start + i * dur, end: s.start + (i + 1) * dur }))
    }
  }
  return NextResponse.json({ words, text: json.text ?? '' })
}