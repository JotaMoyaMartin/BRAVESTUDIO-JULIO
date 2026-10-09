/**
 * PROVIDER ABSTRACTION — edición fotográfica IA (server-only).
 *
 * Retoque Pro NO conoce proveedores: la API de jobs llama a
 * `resolvePhotoEditProvider()` y ejecuta `editImage()`. Cambiar de proveedor
 * es crear otro adapter y mapear el id aquí — sin tocar presets ni UI.
 *
 * Para Añadir/Cambiar de proveedor:
 *   1. Crea un XProvider implements ImageEditProvider (lib/photo-pro/<id>.ts)
 *   2. Regístralo en resolvePhotoEditProvider()
 *   3. Configura sus envs (ver docs/FOTO-PRO.md)
 *
 * Proveedores:
 *   - "gemini": Gemini 2.5 Flash Image (nano banana) — edición real preservando
 *     identidad. Requiere GEMINI_API_KEY (server). Es el default.
 *   - "mock": SOLO para desarrollo/demo. Devuelve la misma foto tras una
 *     pausa simulada. Nunca lo fuerces en producción (photo_edit_jobs deja
 *     registro en el row — ver provider en el job).
 *
 * NOTA: este es un cliente de EDICIÓN DE IMAGEN (REST, bytes), no un 4º
 * cliente de texto LLM — la regla de clientes consolidados de CLAUDE.md §8.8
 * aplica a callLLM/extractJSON, que no se tocan aquí.
 */
import {
  ImageEditProvider,
  ImageEditResult,
  EditRequest,
  ProviderEditError,
} from './types'

const GEMINI_BASE_URL =
  process.env.PHOTO_EDIT_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_MODEL =
  process.env.PHOTO_EDIT_MODEL || 'gemini-2.5-flash-image'
const PROVIDER_TIMEOUT_MS = Number(process.env.PHOTO_EDIT_TIMEOUT_MS || 110_000)

export type PhotoEditProviderId = 'gemini' | 'mock'

/** ¿Hay proveedor de edición real disponible para esta deployment? */
export function isPhotoEditConfigured(): boolean {
  const forced = (process.env.PHOTO_EDIT_PROVIDER || '').toLowerCase()
  if (forced === 'mock') return true
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  return forced === 'gemini' ? !!key : !!key
}

function resolveProviderId(): PhotoEditProviderId | null {
  const forced = (process.env.PHOTO_EDIT_PROVIDER || '').toLowerCase()
  if (forced === 'mock') return 'mock'
  if (forced === 'gemini') return 'gemini'
  // Sin PIN: gemini si hay key, si no no hay proveedor (honesto en prod).
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'gemini' : null
}

/* --------------------------------- MOCK ---------------------------------- */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Desarrollo/demo: pausa realista y devuelve la MISMA imagen (badge en UI). */
const mockProvider: ImageEditProvider = {
  id: 'mock',
  async editImage(req: EditRequest): Promise<ImageEditResult> {
    await sleep(Number(process.env.PHOTO_EDIT_MOCK_DELAY_MS || 2_200))
    return {
      resultBase64: req.sourceBase64,
      mime: req.sourceMime,
      model: 'mock-development',
    }
  },
}

/* -------------------------------- GEMINI --------------------------------- */

const stripDataUrl = (b64: string) => (b64.includes('data:') ? b64.split(',')[1] : b64)

const geminiProvider: ImageEditProvider = {
  id: 'gemini',
  async editImage(req: EditRequest): Promise<ImageEditResult> {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!key) throw new ProviderEditError('provider_not_configured', 'GEMINI_API_KEY ausente')

    const { goal, preserve, avoid } = req.instructions
    const prompt = [
      `Edita esta fotografía de una cliente de peluquería. Tu tarea: ${goal}`,
      '',
      'Conserva SIEMPRE:',
      ...preserve.map(p => `- ${p}`),
      '',
      'Prohibido:',
      ...avoid.map(a => `- ${a}`),
      '',
      'Devuelve la misma persona, encuadre y composición de la fotografía editada.',
      'No añadas texto, logos ni marcas de agua.',
    ].join('\n')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
    try {
      const res = await fetch(
        `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: req.sourceMime, data: stripDataUrl(req.sourceBase64) } },
                ],
              },
            ],
          }),
        },
      )

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        if (res.status === 429 || res.status >= 500) {
          throw new ProviderEditError('provider_error', `proveedor respondió ${res.status}`)
        }
        throw new ProviderEditError('provider_error', `provider error ${res.status}: ${body.slice(0, 200)}`)
      }

      const data = (await res.json()) as {
        candidates?: {
          content?: {
            parts?: {
              inlineData?: { mimeType?: string; data?: string }
              inline_data?: { mime_type?: string; data?: string }
            }[]
          }
        }[]
      }

      const parts = data.candidates?.[0]?.content?.parts || []
      const imgPart = parts.find(p => p.inlineData?.data || p.inline_data?.data)
      const b64 = imgPart?.inlineData?.data || imgPart?.inline_data?.data
      const mime =
        imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || 'image/png'

      if (!b64) throw new ProviderEditError('no_image_returned')

      return { resultBase64: b64, mime, model: GEMINI_MODEL }
    } catch (err) {
      if (err instanceof ProviderEditError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProviderEditError('provider_timeout', `El proveedor tardó más de ${PROVIDER_TIMEOUT_MS / 1000}s`)
      }
      // Retriable 5xx/429 → ProviderError genérico, otros → fatal
      throw new ProviderEditError(
        'provider_error',
        err instanceof Error ? err.message : 'error de red',
      )
    } finally {
      clearTimeout(timer)
    }
  },
}

/* ------------------------------- RESOLVER -------------------------------- */

/** Devuelve el provider activo o null si no hay ninguno configurado. */
export function resolvePhotoEditProvider(): ImageEditProvider | null {
  const id = resolveProviderId()
  if (id === 'mock') return mockProvider
  if (id === 'gemini') return isPhotoEditConfigured() ? geminiProvider : null
  return null
}