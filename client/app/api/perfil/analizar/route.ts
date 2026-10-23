import { NextRequest, NextResponse } from 'next/server'
import { callLLM, isServerAIConfigured } from '@/lib/ai/llm'
import { extractJSON } from '@/lib/ai/extract'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { recordAIFailure } from '@/lib/ai/monitor'
import { buildLecturaPrompt, buildTextosPrompt, type Bio, type PerfilActual, type PerfilDatos } from '@/lib/perfil/optimiza'

/**
 * OPTIMIZA TU PERFIL · IA (23-oct-2026).
 * 1) Si llega una captura del perfil, el modelo de visión la LEE (nombre,
 *    bio, links, destacadas, tipo de foto). No opina: solo copia lo que ve.
 * 2) El modelo de texto propone 3 nombres y 3 bios con los datos de Mi Marca.
 * Las cuentas y los consejos se hacen con reglas en el navegador
 * (lib/perfil/optimiza.ts); si esto falla, la pantalla sigue funcionando.
 */

const MAX_IMAGE_CHARS = 3_000_000 // ~2,2 MB en base64
const RATE_LIMIT_PER_MINUTE = 6

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const strList = (v: unknown, n = 12) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => (x as string).slice(0, 200)).slice(0, n) : undefined)

function cleanActual(raw: unknown): PerfilActual | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const foto = r.foto === 'logo' || r.foto === 'retrato' || r.foto === 'otra' ? r.foto : undefined
  const a: PerfilActual = {
    usuario: str(r.usuario, 60), nombre: str(r.nombre, 80), categoria: str(r.categoria, 60),
    bio: str(r.bio, 400), links: strList(r.links, 6), destacadas: strList(r.destacadas, 15), foto,
  }
  // Una lectura vacía no sirve para revisar nada.
  return a.nombre || a.bio || a.destacadas?.length ? a : null
}

export async function POST(req: NextRequest) {
  if (!isServerAIConfigured()) {
    await recordAIFailure(new Error('AI not configured'), { section: 'mi-marca/perfil' })
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const supabaseConfigured = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')
  let key = `perfil-demo:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'}`
  if (supabaseConfigured) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    key = `perfil:${user.id}`
  }
  const rl = rateLimit(key, RATE_LIMIT_PER_MINUTE, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  let body: { image?: string; datos?: PerfilDatos }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const datos = body.datos
  if (!datos || typeof datos !== 'object') return NextResponse.json({ error: 'Missing datos' }, { status: 400 })
  const image = typeof body.image === 'string' && body.image.startsWith('data:image/') ? body.image : null
  if (image && image.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Image too large' }, { status: 413 })

  // 1) Leer la captura (si la hay). Un fallo aquí no para el resto.
  let actual: PerfilActual | null = null
  let lectura: 'ok' | 'fallo' | 'sin-captura' = 'sin-captura'
  if (image) {
    try {
      const { content } = await callLLM({ prompt: buildLecturaPrompt(), images: [image], temperature: 0, timeoutMs: 60_000, retries: 1, section: 'mi-marca/perfil · leer captura' })
      actual = cleanActual(extractJSON(content))
      lectura = actual ? 'ok' : 'fallo'
    } catch { lectura = 'fallo' }
  }

  // 2) Nombres y bios.
  let nombres: string[] | undefined
  let bios: Bio[] | undefined
  try {
    const { content } = await callLLM({ prompt: buildTextosPrompt(datos, actual), temperature: 0.7, timeoutMs: 60_000, retries: 1, section: 'mi-marca/perfil' })
    const j = extractJSON<{ nombres?: unknown; bios?: unknown }>(content)
    nombres = strList(j?.nombres, 3)
    bios = Array.isArray(j?.bios)
      ? (j!.bios as unknown[]).map(b => ({ estilo: str((b as Bio)?.estilo, 30) ?? '', texto: (str((b as Bio)?.texto, 300) ?? '').trim() })).filter(b => b.estilo && b.texto)
      : undefined
  } catch { /* se usan las bios hechas con reglas */ }

  return NextResponse.json({ actual, lectura, nombres, bios })
}
