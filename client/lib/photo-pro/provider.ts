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
 *   - "gemini": Gemini 2.0 Flash Exp — edición real preservando identidad.
 *     Requiere GEMINI_API_KEY (server). Es el default.
 *   - "mock": SOLO para desarrollo/demo. Devuelve la misma foto tras una
 *     pausa simulada. Nunca lo fuerces en producción.
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
// gemini-2.0-flash-exp soporta edición de imagen (input imagen + texto → output imagen)
// con generationConfig.responseModalities: ["IMAGE", "TEXT"].
// Anterior "gemini-2.5-flash-image" era nombre incorrecto — causaba 404 o texto-only.
const GEMINI_MODEL =
  process.env.PHOTO_EDIT_MODEL || 'gemini-2.0-flash-exp'
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
      'Eres un retocador profesional de fotografías de peluquería y estética.',
      `Tu tarea: ${goal}`,
      '',
      'Reglas OBLIGATORIAS — conserva exactamente:',
      ...preserve.map(p => `• ${p}`),
      '',
      'Prohibido absolutamente:',
      ...avoid.map(a => `• ${a}`),
      '',
      'IMPORTANTE: devuelve la fotografía editada con exactamente el mismo encuadre,',
      'la misma persona y la misma composición. La edición debe parecer natural,',
      'no generada por IA. No añadas texto, logos, marcos ni marcas de agua.',
    ].join('\n')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    // Gemini a veces no devuelve imagen en el primer intento (~15-20% de los casos).
    // Reintentamos 1 vez antes de fallar.
    const MAX_ATTEMPTS = 2

    try {
      let lastError: ProviderEditError | null = null

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (attempt > 1) await sleep(1_500)

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
                    {
                      inline_data: {
                        mime_type: req.sourceMime,
                        data: stripDataUrl(req.sourceBase64),
                      },
                    },
                  ],
                },
              ],
              // SIN responseModalities Gemini devuelve solo texto → no_image_returned.
              // IMAGE + TEXT obligatorio para que el modelo devuelva la imagen editada.
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
              },
            }),
          },
        )

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          if (res.status === 429 || res.status >= 500) {
            throw new ProviderEditError('provider_error', `proveedor respondió ${res.status}`)
          }
          throw new ProviderEditError(
            'provider_error',
            `provider error ${res.status}: ${body.slice(0, 200)}`,
          )
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
          imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || 'image/jpeg'

        if (!b64) {
          lastError = new ProviderEditError('no_image_returned', `intento ${attempt}`)
          continue
        }

        return { resultBase64: b64, mime, model: GEMINI_MODEL }
      }

      throw lastError ?? new ProviderEditError('no_image_returned')
    } catch (err) {
      if (err instanceof ProviderEditError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProviderEditError(
          'provider_timeout',
          `El proveedor tardó más de ${PROVIDER_TIMEOUT_MS / 1000}s`,
        )
      }
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
