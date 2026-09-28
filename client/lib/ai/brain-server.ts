/**
 * ACCESSOR del Business Brain — FASE 1 (server-side).
 *
 * Único punto server-side que compone el contexto del Brain por `purpose`
 * sobre el SEAM de Fase 0 (lib/ai/brain.ts). Reglas:
 *   - Gramática de marca congelada: reutiliza buildBrandFullContext (brand-context.ts).
 *   - Métricas: reutiliza summarizeMetrics (assistant-prompt.ts); null si no hay filas.
 *   - Objetivos: gramática NUEVA de brain-grammar.ts (prioridad única).
 *   - Anti-drift: añade SIEMPRE la línea "ACTUALIZACIÓN EN CALIENTE" con los
 *     chips vivos del wizard (ni un summary viejo pierde la verdad actual).
 *   - `cache()` de React: 1 composición por request (máx 3-4 queries).
 *
 * Consumo previsto: estrategia post-onboarding (F1), HOME/Campañas (F2+).
 * Los flujos client-side existentes NO se rewirean en F1 (modo demo).
 * Ver docs/BUSINESS-BRAIN.md §10-11.
 */

import { cache } from 'react'
import {
  BRAIN_SECTIONS_BY_PURPOSE,
  composeBrainContext,
  type BrainParts,
  type BrainPurpose,
} from '@/lib/ai/brain'
import { buildBrandFullContext } from '@/lib/ai/brand-context'
import { summarizeMetrics } from '@/lib/team/ai/assistant-prompt'
import { buildLiveUpdateLine, buildObjectivesGrammar } from '@/lib/ai/brain-grammar'
import { createClient } from '@/lib/supabase/server'
import type { BrandProfile, Reto10kProgressRow } from '@/types/database'

// Gramática pura re-exportada (consumidores y tests la importan de aquí
// o de brain-grammar directamente).
export {
  PRIORITY_LABELS,
  SHOWS_FACE_LABELS,
  buildObjectivesGrammar,
  buildLiveUpdateLine,
} from '@/lib/ai/brain-grammar'

// ── Accessor ─────────────────────────────────────────────────────────

const FASES_FALLBACK: Record<number, string> = {
  1: 'Pierde el miedo y empieza a mostrarte',
  2: 'Construye tu autoridad',
  3: 'Genera deseo con resultados',
  4: 'Conviértete en referente',
}

async function loadPhaseTitle(phase: number): Promise<string | null> {
  const supabase = await createClient()
  const { data: config } = await supabase
    .from('reto_10k_config')
    .select('config_json')
    .limit(1)
    .maybeSingle()
  const phases = (config?.config_json as { phases?: { order: number; title: string }[] } | null)?.phases || []
  return phases.find(p => p.order === phase)?.title || FASES_FALLBACK[phase] || null
}

/**
 * Compone el contexto del Brain para una usuaria y un propósito.
 * 1 composición por request (cache de React). Devuelve null si no hay nada.
 */
export const buildBrainContext = cache(async (userId: string, purpose: BrainPurpose): Promise<string | null> => {
  const plan = BRAIN_SECTIONS_BY_PURPOSE[purpose]
  const supabase = await createClient()
  const parts: BrainParts = {}
  let brand: BrandProfile | null = null

  if (plan.brand || plan.objectives) {
    const { data } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    brand = (data as BrandProfile | null) ?? null
  }

  if (plan.brand && brand) {
    const base = buildBrandFullContext(brand)
    const live = buildLiveUpdateLine(brand)
    parts.brand = [base || null, live].filter(Boolean).join('\n') || null
  }

  if (plan.metrics) {
    const { data: rows } = await supabase
      .from('metricool_metrics')
      .select('month, network, followers, reach, engagement_rate, posts_count')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(24)
    // summarizeMetrics devuelve 'Sin métricas…' con array vacío → null aquí.
    parts.metrics = rows && rows.length > 0 ? summarizeMetrics(rows) : null
  }

  if (plan.objectives) {
    const { data: retoData } = await supabase
      .from('reto_10k_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    const reto = (retoData as Reto10kProgressRow | null) ?? null
    const phaseTitle = reto?.status === 'active' ? await loadPhaseTitle(reto.current_phase) : null
    parts.objectives = buildObjectivesGrammar(brand, reto, phaseTitle)
  }

  return composeBrainContext(purpose, parts)
})