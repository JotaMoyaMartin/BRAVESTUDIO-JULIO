/**
 * Cliente LLM ÚNICO server-side para BRÄVE Studio.
 *
 * Toda llamada al proveedor (Ollama cloud) debe pasar por aquí:
 * configuración, modelo, timeout, retry y forma del request en un solo sitio.
 *
 * Wrappers existentes que hoy delegan aquí (sus firmas externas no cambian):
 *   - lib/ai/server-generate.ts  → serverGenerateAIContent()
 *   - lib/team/ai/server.ts      → generateAIServer() (con imágenes/visión)
 *   - app/api/ai/generate        → proxy para el browser
 *
 * El browser NO llama al proveedor: usa /api/ai/generate (la key vive solo
 * en env server). Ver docs/ARCHITECTURE.md §5.2.
 */

export interface LLMCallOptions {
  prompt: string
  /** Mensaje system opcional (manual BRÄVE, reglas de rol). */
  system?: string
  /** Imágenes en base64 (con o sin prefijo data:) — activa modelo de visión. */
  images?: string[]
  temperature?: number
  /** Máx. tokens de salida (Ollama `options.num_predict`). */
  maxTokens?: number
  /** Override puntual de modelo (default: env o visión si hay imágenes). */
  model?: string
  /** Timeout en ms (default 60s). */
  timeoutMs?: number
  /** Reintentos ante fallos transitorios (red/timeout/5xx/429). Default 1. */
  retries?: number
}

export interface LLMResult {
  content: string
  model: string
}

/** Error no reintentable (config, 4xx del proveedor, salida vacía). */
export class FatalLLMError extends Error {}

/**
 * Configuración unificada: IA activa si hay API key y el provider no es mock.
 * (Antes: server-generate exigía provider!=='mock' y team exigía ==='ollama'
 * con defaults distintos. En producción AI_PROVIDER='ollama' está definido,
 * así que la unificación no cambia comportamiento.)
 */
export function isServerAIConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase()
  return provider !== 'mock' && !!process.env.AI_API_KEY
}

function stripDataUrlPrefix(img: string): string {
  return img.replace(/^data:[^;]+;base64,/, '')
}

export async function callLLM(options: LLMCallOptions): Promise<LLMResult> {
  if (!isServerAIConfigured()) {
    throw new Error('AI not configured')
  }

  const baseUrl = process.env.OLLAMA_API_URL || 'https://api.ollama.com'
  const model =
    options.model ||
    (options.images && options.images.length > 0
      ? process.env.AI_VISION_MODEL || 'gemma3:12b'
      : process.env.AI_MODEL || 'deepseek-v4-flash')
  const timeoutMs = options.timeoutMs ?? 60_000
  const retries = options.retries ?? 1

  const messages: Record<string, unknown>[] = []
  if (options.system) {
    messages.push({ role: 'system', content: options.system })
  }
  const userMessage: Record<string, unknown> = { role: 'user', content: options.prompt }
  if (options.images && options.images.length > 0) {
    userMessage.images = options.images.map(stripDataUrlPrefix)
  }
  messages.push(userMessage)

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  }
  if (options.temperature !== undefined) {
    requestBody.options = {
      ...(requestBody.options as Record<string, unknown> | undefined),
      temperature: options.temperature,
    }
  }
  if (options.maxTokens !== undefined) {
    requestBody.options = {
      ...(requestBody.options as Record<string, unknown> | undefined),
      num_predict: options.maxTokens,
    }
  }

  let lastError: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 400 * attempt))
    }
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs),
        next: { revalidate: 0 },
      })

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`LLM ${res.status}`)
        continue
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new FatalLLMError(`LLM ${res.status}: ${text.slice(0, 200)}`)
      }

      const data = await res.json()
      const content = data?.message?.content ?? data?.message?.text ?? ''
      if (!content || !content.trim()) {
        throw new FatalLLMError('LLM returned empty content')
      }
      return { content, model }
    } catch (err) {
      if (err instanceof FatalLLMError) throw err
      // Timeout / red / 5xx / 429 → reintentable.
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('LLM request failed')
}

/** Variante tolerante: cualquier fallo → null (para callers con fallback mock). */
export async function callLLMOrNull(options: LLMCallOptions): Promise<LLMResult | null> {
  try {
    return await callLLM(options)
  } catch {
    return null
  }
}