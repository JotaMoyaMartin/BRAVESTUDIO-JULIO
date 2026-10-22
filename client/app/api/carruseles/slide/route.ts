import { NextRequest, NextResponse } from 'next/server'
import { requireDesignAccess } from '@/lib/design/server'
import { rateLimit } from '@/lib/rate-limit'
import { getStyle, VISUAL_TYPES } from '@/lib/carruseles/styles'
import { buildSlidePrompt } from '@/lib/carruseles/prompts'
import { CarouselImageError, resolveCarouselImageProvider } from '@/lib/carruseles/image-provider'
import { ensureCarouselBucket, uploadSlideImage, signSlideUrl } from '@/lib/carruseles/server'
import type { Signature, SlideRequestPayload, VisualType } from '@/lib/carruseles/types'

/**
 * CARRUSELES PREMIUM — generación de UNA slide (imagen completa por IA).
 * POST /api/carruseles/slide → prompt determinista (buildSlidePrompt) →
 * provider (lib/carruseles/image-provider.ts) → sube al bucket privado
 * → firma 24h → { ok, imageUrl, imagePath, mime }.
 *
 * Seguridad: requireDesignAccess (gate común del módulo Diseños), rate limit
 * por usuario, payload validado ESTRICTO (todo campo, sin fiarse del cliente)
 * y errores como mensaje humano — sin detalles internos del proveedor.
 */
const RATE_LIMIT_GENERATIONS = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const DRAFT_ID_RE = /^[a-z0-9-]{6,40}$/i
const MAX_TEXT = 400
const MAX_SUPPORT = 60
const MAX_SIGNATURE = 48

export const maxDuration = 120

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const VISUAL_KEYS = Object.keys(VISUAL_TYPES) as VisualType[]

export async function POST(request: NextRequest) {
  // ── 1) Payload estricto (SlideRequestPayload, con guards — nunca any) ─────
  const body: unknown = await request.json().catch(() => null)
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: 'Petición no válida.' }, { status: 400 })
  }

  const styleId = typeof body.styleId === 'string' ? body.styleId : ''
  const style = getStyle(styleId)
  if (!style) {
    return NextResponse.json({ ok: false, error: 'Estilo no disponible.' }, { status: 400 })
  }
  if (style.status !== 'live') {
    return NextResponse.json({ ok: false, error: 'Estilo no disponible.' }, { status: 400 })
  }

  const totalRaw = body.total
  if (typeof totalRaw !== 'number' || !Number.isInteger(totalRaw) || totalRaw < 1 || totalRaw > 8) {
    return NextResponse.json({ ok: false, error: 'Datos de la slide no válidos.' }, { status: 400 })
  }
  const indexRaw = body.index
  if (
    typeof indexRaw !== 'number' ||
    !Number.isInteger(indexRaw) ||
    indexRaw < 0 ||
    indexRaw >= totalRaw
  ) {
    return NextResponse.json({ ok: false, error: 'Datos de la slide no válidos.' }, { status: 400 })
  }

  const slideRaw = isRecord(body.slide) ? body.slide : null
  if (!slideRaw) {
    return NextResponse.json({ ok: false, error: 'Datos de la slide no válidos.' }, { status: 400 })
  }
  const text = typeof slideRaw.text === 'string' ? slideRaw.text.trim().slice(0, MAX_TEXT) : null
  if (text === null) {
    return NextResponse.json({ ok: false, error: 'Datos de la slide no válidos.' }, { status: 400 })
  }
  const support =
    typeof slideRaw.support === 'string' ? slideRaw.support.trim().slice(0, MAX_SUPPORT) : undefined
  const visual: VisualType = VISUAL_KEYS.includes(slideRaw.visual as VisualType)
    ? (slideRaw.visual as VisualType)
    : 'lifestyle'

  const signatureRaw = isRecord(body.signature) ? body.signature : null
  const signature: Signature = {
    on: signatureRaw?.on === true,
    text:
      typeof signatureRaw?.text === 'string'
        ? signatureRaw.text.trim().slice(0, MAX_SIGNATURE)
        : '',
  }

  const draftId = typeof body.draftId === 'string' ? body.draftId : ''
  if (!DRAFT_ID_RE.test(draftId)) {
    return NextResponse.json({ ok: false, error: 'Datos de la slide no válidos.' }, { status: 400 })
  }

  // ── 2) Gate de acceso (misma gramática del módulo Diseños) ────────────────
  const access = await requireDesignAccess()
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.msg }, { status: access.status })
  }

  // ── 3) Rate limit: 10 generaciones/min por usuaria ────────────────────────
  const rl = rateLimit(`carruseles:${access.userId}`, RATE_LIMIT_GENERATIONS, RATE_LIMIT_WINDOW_MS)
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'too_many_requests',
        message: 'Demasiadas generaciones seguidas. Espera un momento.',
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  // ── 4) Proveedor (demo honesto: sin key no se fingen imágenes) ────────────
  const provider = resolveCarouselImageProvider()
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: 'images_not_available',
        message: 'La generación de imágenes no está disponible en esta cuenta todavía.',
      },
      { status: 501 },
    )
  }

  // ── 5) Generar → guardar → firmar ─────────────────────────────────────────
  // El CTA ya vive DENTRO de slide.text (editado en la UI), así que ctaLine /
  // omitCta no entran desde aquí — el slide manda verbatim.
  const payload: SlideRequestPayload = {
    styleId,
    draftId,
    index: indexRaw,
    slide: { text, support, visual },
    total: totalRaw,
    signature,
  }

  try {
    const prompt = buildSlidePrompt({
      style,
      slide: payload.slide,
      index: payload.index,
      total: payload.total,
      signature: payload.signature,
      ctaLine: null,
      omitCta: false,
    })

    const image = await provider.generateSlideImage({ prompt })
    await ensureCarouselBucket()
    const imagePath = await uploadSlideImage(
      access.userId,
      payload.draftId,
      payload.index,
      image.base64,
      image.mime,
    )
    const { signedUrl } = await signSlideUrl(imagePath)
    if (!signedUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: 'sign_failed',
          message: 'La imagen se generó pero no se pudo firmar. Prueba otra vez.',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true, imageUrl: signedUrl, imagePath, mime: image.mime })
  } catch (err) {
    const code = err instanceof CarouselImageError ? err.code : 'provider_error'
    console.error('[carruseles/slide]', code, err instanceof Error ? err.message : err)
    const userMessage = SAFE_MESSAGES[code] ?? SAFE_MESSAGES['provider_error']
    const status = code === 'no_image_returned' || code === 'provider_timeout' ? 502 : 500
    return NextResponse.json({ ok: false, error: code, message: userMessage }, { status })
  }
}

/** Mensajes humanos — jamás detalles del proveedor (mismo criterio que photo-pro). */
const SAFE_MESSAGES: Record<string, string> = {
  no_image_returned: 'El modelo no devolvió imagen. Prueba otra vez.',
  provider_timeout: 'La generación tardó demasiado. Prueba otra vez.',
  provider_error: 'No se pudo generar esta slide. Prueba otra vez.',
  provider_not_configured: 'La generación de imágenes no está disponible en esta cuenta todavía.',
}