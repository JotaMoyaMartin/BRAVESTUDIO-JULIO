/**
 * Server-side AI content generation — calls the LLM directly without HTTP hop.
 * Used in server route handlers where fetch('/api/ai/generate') may not work
 * reliably. DELEGA en el cliente LLM unificado (lib/ai/llm.ts) — configuración,
 * timeout y retry viven ahí. Misma firma y misma semántica de errores que antes.
 */
import { callLLM } from './llm'
import { extractJSON } from './extract'

export async function serverGenerateAIContent(prompt: string): Promise<string> {
  const { content } = await callLLM({ prompt, timeoutMs: 60_000, retries: 1 })
  return content
}

export { extractJSON }