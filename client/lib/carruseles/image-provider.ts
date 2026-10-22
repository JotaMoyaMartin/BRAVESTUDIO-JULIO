/**
 * PROVIDER ABSTRACTION — generación de imágenes de slides (server-only).
 *
 * Carruseles premium NO conoce proveedores: /api/carruseles/slide llama a
 * `resolveCarouselImageProvider()` y ejecuta `generateSlideImage()`.
 * Cambiar de proveedor es crear otro adapter y mapear el id aquí — sin tocar
 * el contrato (types), los estilos (styles) ni el sistema de prompts.
 *
 * Para Añadir/Cambiar de proveedor:
 *   1. Crea un XProvider implements CarouselImageProvider (lib/carruseles/<id>.ts)
 *   2. Regístralo en resolveCarouselImageProvider()
 *   3. Configura sus envs (CARRUSEL_IMAGE_*)
 *
 * Proveedores:
 *   - "gemini": text-to-image vía generateContent — el slide completo (fotografía
 *     + tipografía + copy) se compone desde el prompt. Requiere GEMINI_API_KEY /
 *     GOOGLE_API_KEY (server). Es el default. Mismo patrón REST + retries que
 *     lib/photo-pro/provider.ts: 2 intentos, 429/5xx reintentables, sin imagen
 *     → 'no_image_returned', timeout abort a los 110s.
 *   - "mock": SOLO para desarrollo/demo. Devuelve un PNG placeholder tras una
 *     pausa simulada. Nunca lo fuerces en producción.
 *
 * NOTA: cliente REST de generación (bytes out), hermana de photo-pro/provider.ts
 * — no toca callLLM/extractJSON (regla de clientes consolidados de CLAUDE.md §8.8).
 */

export interface CarouselSlideImageRequest {
  /** Prompt de imagen completo (buildSlidePrompt) — text-to-image puro. */
  prompt: string
}

export interface CarouselSlideImageResult {
  /** base64 de la imagen (sin prefijo data:). */
  base64: string
  mime: string
  /** Modelo/proveedor usado, para trazabilidad. */
  model: string
}

/** Contrato único de proveedor — sustituir proveedor sin tocar la API. */
export interface CarouselImageProvider {
  id: string
  generateSlideImage(req: CarouselSlideImageRequest): Promise<CarouselSlideImageResult>
}

/** Error del proveedor de imagen con código estable para la UX. */
export type CarouselImageErrorCode =
  | 'provider_not_configured'
  | 'provider_timeout'
  | 'provider_error'
  | 'no_image_returned'

export class CarouselImageError extends Error {
  code: CarouselImageErrorCode

  constructor(code: CarouselImageErrorCode, message?: string) {
    super(message || code)
    this.name = 'CarouselImageError'
    this.code = code
  }
}

const GEMINI_BASE_URL =
  process.env.PHOTO_EDIT_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
// gemini-2.0-flash-exp soporta text-to-image con
// generationConfig.responseModalities: ["IMAGE", "TEXT"] (fábrica de slides).
const GEMINI_MODEL =
  process.env.CARRUSEL_IMAGE_MODEL || 'gemini-2.0-flash-exp'
const PROVIDER_TIMEOUT_MS = Number(process.env.CARRUSEL_IMAGE_TIMEOUT_MS || 110_000)

/** ¿Hay proveedor de generación real disponible para esta deployment? */
export function isCarouselImageConfigured(): boolean {
  const forced = (process.env.CARRUSEL_IMAGE_PROVIDER || '').toLowerCase()
  if (forced === 'mock') return true
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  return !!key
}

function resolveProviderId(): 'gemini' | 'mock' | null {
  const forced = (process.env.CARRUSEL_IMAGE_PROVIDER || '').toLowerCase()
  if (forced === 'mock') return 'mock'
  if (forced === 'gemini') return 'gemini'
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'gemini' : null
}

/* --------------------------------- MOCK ---------------------------------- */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Placeholder de desarrollo: PNG válido de 4×5px RGB (taupe rojizo de la
 * paleta neutra de la marca). El slide real lo genera el proveedor activo.
 */
const MOCK_PLACEHOLDER_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAIAAADtz9qMAAAAEElEQVR4nGM4kZAHRwxkcAAOYR+5x4m97gAAAABJRU5ErkJggg=='

/** Desarrollo/demo: pausa realista y devuelve un PNG placeholder. */
const mockProvider: CarouselImageProvider = {
  id: 'mock',
  async generateSlideImage(_req: CarouselSlideImageRequest): Promise<CarouselSlideImageResult> {
    await sleep(Number(process.env.CARRUSEL_IMAGE_MOCK_DELAY_MS || 2_000))
    return {
      base64: MOCK_PLACEHOLDER_BASE64,
      mime: 'image/png',
      model: 'mock-development',
    }
  },
}

/* -------------------------------- GEMINI --------------------------------- */

const geminiProvider: CarouselImageProvider = {
  id: 'gemini',
  async generateSlideImage(req: CarouselSlideImageRequest): Promise<CarouselSlideImageResult> {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!key) throw new CarouselImageError('provider_not_configured', 'GEMINI_API_KEY ausente')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    // Gemini a veces no devuelve imagen al primer intento (~15-20% de los casos)
    // y 429/5xx son puntuales. Reintentamos UNA vez antes de fallar.
    const MAX_ATTEMPTS = 2

    try {
      let lastError: CarouselImageError | null = null

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (attempt > 1) await sleep(1_500)

        const res = await fetch(
          `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              // Text-to-image puro: SOLO el prompt, sin inline_data de entrada.
              contents: [
                {
                  parts: [
                    { text: req.prompt },
                  ],
                },
              ],
              // SIN responseModalities Gemini devuelve solo texto → no_image_returned.
              // IMAGE + TEXT obligatorio para que el modelo devuelva la imagen.
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
              },
            }),
          },
        )

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          if (res.status === 429 || res.status >= 500) {
            // Transitorio → reintentable.
            lastError = new CarouselImageError('provider_error', `proveedor respondió ${res.status}`)
            continue
          }
          throw new CarouselImageError(
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
          imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || 'image/png'

        if (!b64) {
          lastError = new CarouselImageError('no_image_returned', `intento ${attempt}`)
          continue
        }

        return { base64: b64, mime, model: GEMINI_MODEL }
      }

      throw lastError ?? new CarouselImageError('no_image_returned')
    } catch (err) {
      if (err instanceof CarouselImageError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new CarouselImageError(
          'provider_timeout',
          `El proveedor tardó más de ${PROVIDER_TIMEOUT_MS / 1000}s`,
        )
      }
      throw new CarouselImageError(
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
export function resolveCarouselImageProvider(): CarouselImageProvider | null {
  const id = resolveProviderId()
  if (id === 'mock') return mockProvider
  if (id === 'gemini') return isCarouselImageConfigured() ? geminiProvider : null
  return null
}