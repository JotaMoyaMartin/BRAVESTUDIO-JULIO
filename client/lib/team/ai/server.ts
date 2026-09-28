/**
 * Server-side AI call for the Modo Equipo. Delegates to the unified LLM
 * client (lib/ai/llm.ts) — vision model selection included there.
 *
 * Returns null (instead of throwing) so the caller falls back to a mock that
 * still follows the BRÄVE manual structure. Same signature as before.
 */
import { callLLMOrNull, isServerAIConfigured } from '@/lib/ai/llm'
import { extractJSON } from '@/lib/ai/extract'

export async function generateAIServer(
  prompt: string,
  images?: string[]
): Promise<string | null> {
  if (!isServerAIConfigured()) return null
  // 45s y sin retries: se preserva la semántica previa (fallo rápido → mock).
  const { content } = (await callLLMOrNull({ prompt, images, timeoutMs: 45_000, retries: 0 })) ?? {}
  return content ?? null
}

export { extractJSON }