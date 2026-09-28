import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Tests del cliente LLM unificado (lib/ai/llm.ts).
 * Se mockea el fetch global; las env vars se stubbean por test.
 */

const ORIGINAL_ENV = { ...process.env }

function mockFetchOnce(payload: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  })
}

function configureAI(provider = 'ollama', key = 'test-key') {
  process.env.AI_PROVIDER = provider
  process.env.AI_API_KEY = key
  delete process.env.AI_MODEL
  delete process.env.AI_VISION_MODEL
}

beforeEach(() => {
  vi.unstubAllGlobals()
})
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

describe('isServerAIConfigured', () => {
  it('true con provider real + API key', async () => {
    configureAI()
    const { isServerAIConfigured } = await import('@/lib/ai/llm')
    expect(isServerAIConfigured()).toBe(true)
  })

  it('false con provider mock', async () => {
    configureAI('mock')
    const { isServerAIConfigured } = await import('@/lib/ai/llm')
    expect(isServerAIConfigured()).toBe(false)
  })

  it('false sin API key', async () => {
    configureAI('ollama', '')
    const { isServerAIConfigured } = await import('@/lib/ai/llm')
    expect(isServerAIConfigured()).toBe(false)
  })
})

describe('callLLM', () => {
  it('devuelve content y model en éxito', async () => {
    configureAI()
    process.env.AI_MODEL = 'deepseek-v4-flash'
    const fetchMock = mockFetchOnce({ message: { content: 'hola' } })
    vi.stubGlobal('fetch', fetchMock)
    const { callLLM } = await import('@/lib/ai/llm')
    const res = await callLLM({ prompt: 'test' })
    expect(res).toEqual({ content: 'hola', model: 'deepseek-v4-flash' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // Authorization con la key del env, nunca en el cliente.
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers.Authorization).toBe('Bearer test-key')
  })

  it('lanza error si no está configurada', async () => {
    configureAI('mock')
    const { callLLM } = await import('@/lib/ai/llm')
    await expect(callLLM({ prompt: 'x' })).rejects.toThrow('AI not configured')
  })

  it('FatalLLMError en 4xx (no reintenta)', async () => {
    configureAI()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => 'bad request',
    })
    vi.stubGlobal('fetch', fetchMock)
    const { callLLM, FatalLLMError } = await import('@/lib/ai/llm')
    await expect(callLLM({ prompt: 'x', retries: 2 })).rejects.toBeInstanceOf(FatalLLMError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reintenta en 5xx y se recupera', async () => {
    configureAI()
    process.env.AI_MODEL = 'm'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}), text: async () => '' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: { content: 'ok' } }) })
    vi.stubGlobal('fetch', fetchMock)
    const { callLLM } = await import('@/lib/ai/llm')
    const res = await callLLM({ prompt: 'x', retries: 1 })
    expect(res.content).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fallo transitorio (abort/timeout) → reintenta y agota con error del último intento', async () => {
    configureAI()
    // Simula un abort por timeout (AbortSignal.timeout dispara un error transitorio).
    const fetchMock = vi.fn().mockRejectedValue(new Error('The operation was aborted'))
    vi.stubGlobal('fetch', fetchMock)
    const { callLLM } = await import('@/lib/ai/llm')
    await expect(callLLM({ prompt: 'x', timeoutMs: 50, retries: 1 })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(2) // 1 intento inicial + 1 reintento
  })

  it('con imágenes usa modelo de visión', async () => {
    configureAI()
    const fetchMock = mockFetchOnce({ message: { content: 'desc' } })
    vi.stubGlobal('fetch', fetchMock)
    const { callLLM } = await import('@/lib/ai/llm')
    await callLLM({ prompt: 'describe', images: ['data:image/png;base64,AAA='] })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('gemma3:12b')
    expect(body.messages[0].images).toEqual(['AAA=']) // strip del data: prefix
  })

  it('callLLMOrNull devuelve null en fallo (fallback mock de callers)', async () => {
    configureAI('mock')
    const { callLLMOrNull } = await import('@/lib/ai/llm')
    expect(await callLLMOrNull({ prompt: 'x' })).toBeNull()
  })

  it('callLLMOrNull devuelve resultado en éxito', async () => {
    configureAI()
    vi.stubGlobal('fetch', mockFetchOnce({ message: { content: 'ok' } }))
    const { callLLMOrNull } = await import('@/lib/ai/llm')
    const res = await callLLMOrNull({ prompt: 'x' })
    expect(res?.content).toBe('ok')
  })
})