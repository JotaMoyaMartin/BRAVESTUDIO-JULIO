import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024 // una nota de voz de varios minutos

/**
 * Nota de voz → texto (Crear guiones y cualquier campo «dímelo a voz»).
 * Recibe el audio tal cual lo graba el navegador (webm en Chrome/Android,
 * mp4/m4a en iPhone). Mismo proveedor que Editar Videos: GROQ_API_KEY
 * (whisper-large-v3) con fallback OPENAI_API_KEY. La key nunca llega al browser.
 */
export async function POST(request: NextRequest) {
  const supabaseConfigured = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')
  if (supabaseConfigured) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'no_session' }, { status: 401 })
    const rl = rateLimit(`voice-${user.id}`, 15, 60_000)
    if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  } else {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rl = rateLimit(`voice-demo-${ip}`, 15, 60_000)
    if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!groqKey && !openaiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 501 })
  }

  const audio = await request.blob()
  if (!audio || audio.size === 0) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 })

  const type = (request.headers.get('content-type') || audio.type || '').toLowerCase()
  const ext = type.includes('mp4') || type.includes('m4a') || type.includes('aac') ? 'm4a'
    : type.includes('ogg') ? 'ogg'
    : type.includes('wav') ? 'wav'
    : type.includes('mpeg') || type.includes('mp3') ? 'mp3'
    : 'webm'

  const form = new FormData()
  form.append('file', audio, `nota.${ext}`)
  form.append('model', groqKey ? 'whisper-large-v3' : 'whisper-1')
  form.append('language', 'es')
  form.append('response_format', 'json')
  // Vocabulario del sector: ayuda a que no escriba «bala y ase» o «queratina» mal.
  form.append('prompt', 'Peluquería y salón de belleza: balayage, mechas, babylights, matiz, tono, decoloración, keratina, alisado, olaplex, canas, raíz, fibra capilar, Reel, Instagram.')

  const res = await fetch(`${groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1'}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey ?? openaiKey}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => '') : 'network'
    console.error('[transcribe-voice]', res?.status, detail.slice(0, 300))
    return NextResponse.json({ error: 'provider_error' }, { status: 502 })
  }
  const json = await res.json().catch(() => ({}))
  const text = typeof json?.text === 'string' ? json.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'no_speech' }, { status: 422 })
  return NextResponse.json({ text })
}
