import { NextRequest, NextResponse } from 'next/server'
import { callLLM, isServerAIConfigured } from '@/lib/ai/llm'
import { extractJSON } from '@/lib/ai/extract'
import { rateLimit } from '@/lib/rate-limit'
import { buildBrainContext } from '@/lib/ai/brain-server'
import { buildDesignTextsPrompt, clampDesignText, DesignTextFieldSpec } from '@/lib/ai/prompts/design-texts'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPublishedTemplate, requireDesignAccess, sanitizeField, isUuid } from '@/lib/design/server'

/**
 * IA para los textos de una plantilla (módulo clienta "Diseños").
 * MISMA infraestructura LLM que el resto de la app (regla §7): callLLM
 * (lib/ai/llm.ts) + extractJSON canónico + rate limit 20/min + cap de prompt.
 *
 * Contexto de marca OBLIGATORIO vía buildBrainContext (lib/ai/brain-server.ts)
 * con propósito 'carousel' (marca + objetivos, sin métricas/historial: los
 * textos de un diseño son copy corto).
 */

const MAX_PROMPT_LENGTH = 30_000
const RATE_LIMIT_PER_MINUTE = 20
const MAX_FIELDS = 40

export async function POST(request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  if (!isServerAIConfigured()) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const rl = rateLimit(`design-ai:${auth.userId}`, RATE_LIMIT_PER_MINUTE, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones — espera un momento', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const body = (await request.json().catch(() => null)) as
    | { templateId?: string; fields?: unknown; note?: unknown }
    | null
  if (!body || !Array.isArray(body.fields) || body.fields.length === 0) {
    return NextResponse.json({ error: 'Falta la lista de campos' }, { status: 400 })
  }
  if (body.fields.length > MAX_FIELDS) {
    return NextResponse.json({ error: 'Demasiados campos en una sola petición' }, { status: 400 })
  }

  // Especificaciones saneadas: field contra el mapa del dataset (mismo
  // convenio que /api/design/photo), specs con límites acotados.
  const fields: DesignTextFieldSpec[] = []
  const seen = new Set<string>()
  for (const raw of body.fields) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as { field?: unknown; label?: unknown; purpose?: unknown; maxLength?: unknown; instructions?: unknown }
    const field = sanitizeField(r.field)
    if (!field || seen.has(field)) continue
    seen.add(field)
    const spec: DesignTextFieldSpec = { field }
    if (typeof r.label === 'string' && r.label.trim()) spec.label = r.label.trim().slice(0, 120)
    if (typeof r.purpose === 'string' && r.purpose.trim()) spec.purpose = r.purpose.trim().slice(0, 60)
    if (typeof r.instructions === 'string' && r.instructions.trim()) spec.instructions = r.instructions.trim().slice(0, 500)
    if (typeof r.maxLength === 'number' && r.maxLength > 0 && r.maxLength <= 500) {
      spec.maxLength = Math.round(r.maxLength)
    }
    fields.push(spec)
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'Ningún campo válido' }, { status: 400 })
  }

  // Plantilla opcional: solo contexto (nombre) — valida que siga publicada.
  let templateName: string | null = null
  if (typeof body.templateId === 'string' && body.templateId) {
    if (!isUuid(body.templateId)) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }
    const admin = createAdminClient()
    let row = null
    try {
      row = await fetchPublishedTemplate(admin, body.templateId)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
    if (!row) return NextResponse.json({ error: 'Esta plantilla ya no está disponible' }, { status: 404 })
    templateName = row.name
  }

  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null

  try {
    const brainContext = await buildBrainContext(auth.userId, 'carousel')
    const prompt = buildDesignTextsPrompt({ fields, templateName, brandContext: brainContext, note })
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: 'La petición es demasiado grande' }, { status: 400 })
    }

    const { content } = await callLLM({ prompt, timeoutMs: 60_000, retries: 1 })
    const parsed = extractJSON<{ texts?: Record<string, unknown> } | Record<string, unknown>>(content)

    // Tolerante: {texts:{...}} o el objeto plano {campo:"texto"}.
    const rawTexts =
      parsed && typeof parsed === 'object'
        ? ((parsed as { texts?: Record<string, unknown> }).texts ?? (parsed as Record<string, unknown>))
        : {}

    const texts: Record<string, string> = {}
    const maxByField = new Map(fields.map(f => [f.field, f.maxLength]))
    for (const field of fields.map(f => f.field)) {
      const raw = rawTexts[field]
      if (typeof raw !== 'string') continue
      const text = clampDesignText(raw, maxByField.get(field) ?? null)
      if (text.length >= 1) texts[field] = text
    }
    if (Object.keys(texts).length === 0) {
      return NextResponse.json({ error: 'La IA no generó texto para ningún campo' }, { status: 502 })
    }

    return NextResponse.json({ texts })
  } catch (err) {
    if (err instanceof Error && err.message === 'AI not configured') {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'La IA no respondió', detail: msg }, { status: 502 })
  }
}