import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { PhotoMode, ProviderEditError } from '@/lib/photo-pro/types'
import { MODE_META, INTENSITY_LIMIT, buildInstructions } from '@/lib/photo-pro/presets'
import { resolvePhotoEditProvider } from '@/lib/photo-pro/provider'

/**
 * FOTO PRO — jobs de edición (Retoque Pro).
 *
 * POST  /api/photo-pro/jobs   → crear job + correr el provider inline
 *         (UNA pulsación "Aplicar mejora" = UNA llamada al proveedor:
 *          ni seleccionar preset ni cambiar intensidad consulta nada)
 * GET   /api/photo-pro/jobs   → historial reciente (para re-entrar a resultados)
 *
 * Seguridad: user desde sesión; asset_path forzado a <user.id>/… (aislamiento);
 * errores al cliente como mensaje seguro (sin detalles internos del proveedor).
 */
const BUCKET = 'photo-pro'
const SIGNED_URL_TTL = 3600
const RATE_LIMIT_PER_MIN = 10

export const maxDuration = 120

interface CreateJobBody {
  assetPath?: string
  mode?: string
  intensity?: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = rateLimit(`photo-pro:${user.id}`, RATE_LIMIT_PER_MIN, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'too_many_requests', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  let body: CreateJobBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'json_invalido' }, { status: 400 })
  }

  const mode = body.mode as PhotoMode | undefined
  const intensity = Number(body.intensity)
  if (!mode || !MODE_META[mode]) return NextResponse.json({ error: 'modo_no_valido' }, { status: 400 })
  const lim = INTENSITY_LIMIT[mode]
  if (!Number.isInteger(intensity) || intensity < lim.min || intensity > lim.max) {
    return NextResponse.json({ error: 'intensidad_no_valida' }, { status: 400 })
  }

  // Aislamiento: la foto debe vivir EN el prefijo del usuario.
  const assetPath = body.assetPath || ''
  if (!assetPath.startsWith(`${user.id}/`) || assetPath.includes('..')) {
    return NextResponse.json({ error: 'asset_no_valido' }, { status: 403 })
  }

  const provider = resolvePhotoEditProvider()
  if (!provider) {
    // HONESTO: sin proveedor conectado no se finge procesado — falla claro.
    return NextResponse.json(
      { error: 'provider_not_configured' },
      { status: 503 },
    )
  }

  const admin = createAdminClient()
  const db = supabase // con RLS: solo toca filas del usuario

  // Protección extra anti doble-submit server-side: mismo asset en
  // procesamiento iniciado hace <20s → devolver ese y NO crear otro.
  const { data: inFlight } = await db
    .from('photo_edit_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('asset_path', assetPath)
    .eq('status', 'processing')
    .gte('created_at', new Date(Date.now() - 20_000).toISOString())
    .maybeSingle()
  if (inFlight) {
    const urls = await signJobUrls(admin, inFlight)
    return NextResponse.json({ job: { ...inFlight, ...urls } }, { status: 200 })
  }

  const { data: job, error: eInsert } = await db
    .from('photo_edit_jobs')
    .insert({
      user_id: user.id,
      asset_path: assetPath,
      mode,
      intensity,
      status: 'processing',
      provider: provider.id,
    })
    .select()
    .single()
  if (eInsert || !job) return NextResponse.json({ error: 'db_error' }, { status: 500 })

  try {
    // 1) bajar la foto original (server-side; nunca llega la key al browser)
    const { data: source, error: eSrc } = await admin.storage
      .from(BUCKET)
      .download(assetPath)
    if (eSrc || !source) throw new ProviderEditError('source_unreadable')

    const buf = await source.arrayBuffer()
    const sourceBase64 = Buffer.from(buf).toString('base64')

    // 2) preset: modo + intensidad → instrucciones estructuradas
    const instructions = buildInstructions(mode, intensity)

    // 3) edición (UNA llamada — nunca reintentamos encadenada)
    const result = await provider.editImage({
      sourceBase64,
      sourceMime: source.type || 'image/jpeg',
      instructions,
      mode,
      intensity,
    })

    // 4) guardar resultado junto al original
    const ext = result.mime === 'image/jpeg' ? 'jpg' : result.mime === 'image/webp' ? 'webp' : 'png'
    const resultPath = `${user.id}/${job.id}/result.${ext}`
    const resultBytes = Buffer.from(result.resultBase64, 'base64')
    const { error: eUp } = await admin.storage
      .from(BUCKET)
      .upload(resultPath, resultBytes, { contentType: result.mime })
    if (eUp) throw new ProviderEditError('provider_error', 'saving result failed')

    const { data: updated, error: eDone } = await db
      .from('photo_edit_jobs')
      .update({
        status: 'completed',
        result_path: resultPath,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single()
    if (eDone || !updated) throw new ProviderEditError('db_error', 'update completed failed')

    const urls = await signJobUrls(admin, updated)
    return NextResponse.json({ job: { ...updated, ...urls } })
  } catch (err) {
    const code = err instanceof ProviderEditError ? err.code : 'provider_error'
    const userMessage = SAFE_MESSAGES[code] || SAFE_MESSAGES['provider_error']
    await db
      .from('photo_edit_jobs')
      .update({
        status: 'failed',
        error_code: code,
        error_message: userMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
    return NextResponse.json({ error: code, message: userMessage }, { status: 502 })
  }
}

const SAFE_MESSAGES: Record<string, string> = {
  provider_not_configured: 'La edición con IA aún no está activa en tu cuenta.',
  provider_timeout: 'La edición está tardando demasiado. Inténtalo de nuevo.',
  provider_error: 'No hemos podido editar tu foto esta vez. Inténtalo de nuevo.',
  no_image_returned: 'El proveedor no devolvió imagen. Inténtalo de nuevo.',
  source_unreadable: 'No hemos podido leer tu foto original. Vuelva a subirla.',
}

/** GET — últimas ediciones (historial, para las fotos guardadas). */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: jobs } = await supabase
    .from('photo_edit_jobs')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['completed'])
    .order('created_at', { ascending: false })
    .limit(12)
  if (!jobs) return NextResponse.json({ jobs: [] })

  const admin = createAdminClient()
  const withUrls = await Promise.all(
    jobs.map(async j => ({ ...j, ...(await signJobUrls(admin, j)) })),
  )
  return NextResponse.json({ jobs: withUrls })
}

type JobRow = { asset_path: string; result_path: string | null }

/** Signed URLs 1h para mostrar (original + resultado) — sin exposición pública. */
async function signJobUrls(
  admin: ReturnType<typeof createAdminClient>,
  job: JobRow,
): Promise<{ source_url?: string | null; result_url?: string | null }> {
  const [src, res] = await Promise.all([
    admin.storage.from(BUCKET).createSignedUrl(job.asset_path, SIGNED_URL_TTL),
    job.result_path
      ? admin.storage.from(BUCKET).createSignedUrl(job.result_path, SIGNED_URL_TTL)
      : Promise.resolve({ data: null } as unknown as { data: { signedUrl: string } | null }),
  ])
  return {
    source_url: src.data?.signedUrl ?? null,
    result_url: res.data?.signedUrl ?? null,
  }
}