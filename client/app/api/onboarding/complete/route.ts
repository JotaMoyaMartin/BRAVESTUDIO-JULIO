import { NextRequest, NextResponse } from 'next/server'
import { callLLM, isServerAIConfigured } from '@/lib/ai/llm'
import { extractJSON } from '@/lib/ai/extract'
import { BRAIN_STRATEGY_PROMPT } from '@/lib/ai/prompts/strategy'
import { buildOnboardingFicha } from '@/lib/ai/brain-grammar'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

/**
 * POST /api/onboarding/complete — FASE 1 (Business Brain).
 *
 * La wizard de onboarding envía aquí los datos verificados del salón:
 *   1. Actualiza `profiles` (full_name/salon_name si llegan).
 *   2. Upsert en `brand_profiles` (campos del wizard) con completion_status
 *      'partial' — los writes SIEMPRE van antes que la IA.
 *   3. Genera la estrategia con BRAIN_STRATEGY_PROMPT (ficha del salón) y
 *      persiste strategy_json + strategy_generated_at + optimized_summary →
 *      completion_status 'complete'. Si la IA falla → queda 'partial' y la
 *      usuaria reintenta desde Mi Marca (sin endpoint nuevo).
 *
 * Modo edición (retomar el wizard con marca ya completa): idempotencia —
 * sin `regenerate` NO vuelve a gastar una generación.
 *
 * Permit-listeada en middleware (usuarios SIN acceso activo deben poder
 * completar el onboarding). maxDuration=60: la generación puede tardar.
 */

export const maxDuration = 60

const RATE_LIMIT_PER_MINUTE = 5

const PRIORITIES = ['citas', 'descubrir', 'reconocimiento', 'servicio', 'constancia', 'valor'] as const
const FACES = ['talk', 'appear', 'work_only', 'no'] as const

type Priority = (typeof PRIORITIES)[number]
type Face = (typeof FACES)[number]

interface Payload {
  full_name?: string
  salon_name?: string
  team_info?: string
  main_services?: string[]
  service_to_promote?: string
  differentiation?: string | null
  main_priority?: string
  shows_face?: string
  regenerate?: boolean
}

function sanitize(body: unknown): Payload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) || undefined : undefined

  const services = Array.isArray(b.main_services)
    ? b.main_services
        .filter((s): s is string => typeof s === 'string')
        .map(s => s.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : undefined

  const servicesSafe = services && services.length > 0 ? services : undefined

  const priority = PRIORITIES.includes(b.main_priority as Priority)
    ? (b.main_priority as Priority)
    : undefined
  const face = FACES.includes(b.shows_face as Face) ? (b.shows_face as Face) : undefined

  // El servicio estrella tiene que existir en la lista que eligió.
  const star = typeof b.service_to_promote === 'string'
    && servicesSafe?.includes(b.service_to_promote)
    ? b.service_to_promote
    : servicesSafe?.[0]

  return {
    full_name: str(b.full_name, 80),
    salon_name: str(b.salon_name, 80),
    team_info: str(b.team_info, 40),
    main_services: servicesSafe,
    service_to_promote: star,
    differentiation: b.differentiation == null ? null : str(b.differentiation, 240) || null,
    main_priority: priority,
    shows_face: face,
    regenerate: b.regenerate === true,
  }
}

export async function POST(req: NextRequest) {
  const supabaseConfigured = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

  // Modo demo: el wizard escribe en localStorage; aquí solo confirmamos.
  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true, completion: 'complete', demo: true })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`onboarding:${user.id}`, RATE_LIMIT_PER_MINUTE, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const payload = sanitize(body)
  if (!payload?.main_services) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── 1. Profiles (datos de gate) ──────────────────────────────────
  const profilesUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.full_name) profilesUpdate.full_name = payload.full_name
  if (payload.salon_name) profilesUpdate.salon_name = payload.salon_name
  await supabase.from('profiles').update(profilesUpdate).eq('id', user.id)

  // ── 2. Idempotencia: ¿ya hay estrategia completa? ────────────────
  const { data: existing } = await supabase
    .from('brand_profiles')
    .select('id, completion_status, strategy_json, optimized_summary, raw_input')
    .eq('user_id', user.id)
    .maybeSingle()

  const alreadyComplete = existing?.completion_status === 'complete' && !!existing?.strategy_json
  if (alreadyComplete && !payload.regenerate) {
    // Modo edición: solo refresca los campos vivos, sin regenerar.
    const editUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (payload.main_services) editUpdate.main_services = payload.main_services
    if (payload.service_to_promote) editUpdate.service_to_promote = payload.service_to_promote
    if (payload.team_info) editUpdate.team_info = payload.team_info
    if (payload.differentiation !== undefined) editUpdate.differentiation = payload.differentiation
    if (payload.main_priority) editUpdate.main_priority = payload.main_priority
    if (payload.shows_face) editUpdate.shows_face = payload.shows_face
    await supabase.from('brand_profiles').update(editUpdate).eq('id', existing!.id)
    await recordObservation(supabase, user.id, payload)
    return NextResponse.json({ ok: true, completion: 'complete' })
  }

  // ── 3. Writes primero (visible ya con 'partial' si la IA tarda/falla) ──
  const basePayload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (payload.main_services) basePayload.main_services = payload.main_services
  if (payload.service_to_promote) basePayload.service_to_promote = payload.service_to_promote
  if (payload.team_info) basePayload.team_info = payload.team_info
  if (payload.differentiation !== undefined) basePayload.differentiation = payload.differentiation
  if (payload.main_priority) basePayload.main_priority = payload.main_priority
  if (payload.shows_face) basePayload.shows_face = payload.shows_face
  basePayload.completion_status = 'partial'

  // Preserve el trabajo previo de Mi Marca si existe (nunca limpiar).
  if (existing?.raw_input) basePayload.raw_input = existing.raw_input
  if (existing?.optimized_summary) basePayload.optimized_summary = existing.optimized_summary
  if (existing?.strategy_json) basePayload.strategy_json = existing.strategy_json

  const { data: upserted, error: upsertError } = await supabase
    .from('brand_profiles')
    .upsert(basePayload, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (upsertError || !upserted) {
    return NextResponse.json({ error: 'Could not save brand' }, { status: 500 })
  }
  const rowId = (upserted as { id: string }).id

  // Sin IA configurada → la estrategia queda para Mi Marca.
  if (!isServerAIConfigured()) {
    return NextResponse.json({ ok: true, completion: 'partial' })
  }

  // ── 4. Estrategia (LLM server-side, ficha del salón) ─────────────
  const { data: reto } = await supabase
    .from('reto_10k_progress')
    .select('current_day, current_phase, posts_per_week, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const ficha = buildOnboardingFicha({
    full_name: payload.full_name || null,
    salon_name: payload.salon_name || null,
    team_info: payload.team_info || null,
    main_services: payload.main_services || null,
    service_to_promote: payload.service_to_promote || null,
    differentiation: payload.differentiation ?? null,
    main_priority: payload.main_priority || null,
    shows_face: payload.shows_face || null,
    reto: reto?.status === 'active'
      ? { current_day: reto.current_day, current_phase: reto.current_phase, posts_per_week: reto.posts_per_week }
      : null,
    existing_summary: (existing?.optimized_summary as string | null) || null,
  })

  try {
    const { content } = await callLLM({
      prompt: BRAIN_STRATEGY_PROMPT(ficha),
      timeoutMs: 60_000,
      retries: 1,
    })
    const parsed = extractJSON<Record<string, unknown>>(content)
    if (!parsed || typeof parsed.perfil_brave !== 'string' || !parsed.perfil_brave) {
      throw new Error('Respuesta de IA incompleta')
    }

    const strategyJson = { ...parsed, strategy_generated_at: new Date().toISOString() }
    const summary = typeof parsed.resumen_para_ia === 'string' && parsed.resumen_para_ia
      ? parsed.resumen_para_ia
      : parsed.perfil_brave as string

    const { error: updateError } = await supabase
      .from('brand_profiles')
      .update({
        strategy_json: strategyJson,
        optimized_summary: summary,
        completion_status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rowId)

    if (updateError) throw new Error('No se pudo guardar la estrategia')
    if (payload.regenerate) {
      await recordObservation(supabase, user.id, payload)
    }
    return NextResponse.json({ ok: true, completion: 'complete' })
  } catch {
    // La IA falló: el onboarding ya está guardado ('partial').
    // La usuaria reintenta desde Mi Marca → generateStrategy (sin endpoint nuevo).
    return NextResponse.json({ ok: true, completion: 'partial' })
  }
}

/** Aprendizaje progresivo (spec §12): nunca rompe la respuesta. */
async function recordObservation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  payload: Payload,
): Promise<void> {
  try {
    const bits: string[] = []
    if (payload.main_priority) bits.push(`prioridad: ${payload.main_priority}`)
    if (payload.differentiation) bits.push(`valoración: ${payload.differentiation}`)
    if (payload.service_to_promote) bits.push(`estrella: ${payload.service_to_promote}`)
    if (!bits.length) return
    await supabase.from('brain_observations').insert({
      user_id: userId,
      kind: 'manual',
      observation: `Onboarding actualizado — ${bits.join(' · ')}`,
      source: 'onboarding',
    })
  } catch {
    // silencioso
  }
}