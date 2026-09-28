/**
 * Gramática del Business Brain — funciones PURAS (sin I/O, sin React).
 *
 * Separadas del accessor (brain-server.ts) para ser testeables sin el
 * runtime de Next y reutilizables por cualquier consumidor server-side.
 * Spec: docs/BUSINESS-BRAIN.md §9-10.
 */

import type { BrandProfile } from '@/types/database'

// ── Mapeos humano (lenguaje del onboarding, sin jerga de marketing) ──

export const PRIORITY_LABELS: Record<NonNullable<BrandProfile['main_priority']>, string> = {
  citas: 'Conseguir más citas',
  descubrir: 'Conseguir que más personas descubran su trabajo',
  reconocimiento: 'Que la reconozcan como especialista',
  servicio: 'Vender más un servicio concreto',
  constancia: 'Ser más constante publicando',
  valor: 'Aumentar el valor de sus servicios',
}

export const SHOWS_FACE_LABELS: Record<NonNullable<BrandProfile['shows_face']>, string> = {
  talk: 'Sale a cámara y habla',
  appear: 'Aparece en imagen, pero prefiere no hablar a cámara',
  work_only: 'Solo muestra su trabajo (sin su rostro)',
  no: 'Todavía no sale a cámara',
}

export type TeamInfoValue = 'independiente' | 'ajeno' | 'propio' | 'equipo'

export const TEAM_INFO_LABELS: Record<TeamInfoValue, string> = {
  independiente: 'Por mi cuenta, independiente',
  ajeno: 'En el salón de otra persona',
  propio: 'En mi propio salón',
  equipo: 'En mi salón, con equipo',
}

const TEAM_INFO_FICHA: Record<TeamInfoValue, string> = {
  independiente: 'trabaja por su cuenta, independiente',
  ajeno: 'trabaja en el salón de otra persona',
  propio: 'trabaja en su propio salón',
  equipo: 'trabaja en su salón, con equipo',
}

// ── Ficha del salón para BRAIN_STRATEGY_PROMPT (spec §10) ───────────

export interface OnboardingFichaInput {
  full_name?: string | null
  salon_name?: string | null
  team_info?: string | null
  city?: string | null
  main_services?: string[] | null
  service_to_promote?: string | null
  differentiation?: string | null
  main_priority?: string | null   // valor crudo del enum
  shows_face?: string | null      // valor crudo del enum
  reto?: { current_day: number; current_phase: number; posts_per_week: number } | null
  existing_summary?: string | null
}

/**
 * Ficha intermedia que alimenta la estrategia post-onboarding.
 * Datos verificados del wizard — nada inferido del browser.
 */
export function buildOnboardingFicha(input: OnboardingFichaInput): string {
  const lines: string[] = ['FICHA DEL SALÓN — datos verificados (BRÄVE ya tomó estas decisiones de marketing con la estilista):']

  if (input.full_name) lines.push(`- Estilista: ${input.full_name}`)
  if (input.salon_name) lines.push(`- Salón/marca: ${input.salon_name}`)
  const team = input.team_info && input.team_info in TEAM_INFO_FICHA
    ? TEAM_INFO_FICHA[input.team_info as TeamInfoValue]
    : null
  if (team) lines.push(`- Dónde trabaja: ${team}`)
  if (input.city) lines.push(`- Ciudad: ${input.city}`)
  if (input.main_services?.length) lines.push(`- Servicios que hace: ${input.main_services.join(', ')}`)
  if (input.service_to_promote) lines.push(`- Servicio estrella: ${input.service_to_promote}`)
  if (input.differentiation) lines.push(`- Lo que quiere que una nueva clienta valore de ella: ${input.differentiation}`)
  if (input.main_priority && input.main_priority in PRIORITY_LABELS) {
    lines.push(`- Su prioridad ahora: ${PRIORITY_LABELS[input.main_priority as NonNullable<BrandProfile['main_priority']>]} (la eligió ella de una lista — respétala al priorizar)`)
  }
  if (input.shows_face && input.shows_face in SHOWS_FACE_LABELS) {
    lines.push(`- Relación con la cámara: ${SHOWS_FACE_LABELS[input.shows_face as NonNullable<BrandProfile['shows_face']>]}`)
  }
  if (input.reto) {
    lines.push(`- Está en el Reto 10K: día ${input.reto.current_day} de 30, ${input.reto.posts_per_week} posts/semana`)
  }
  if (input.existing_summary) {
    lines.push(`- Contexto previo de marca que ya conocía BRÄVE: ${input.existing_summary}`)
  }

  return lines.join('\n')
}

// ── Gramática de objetivos (NUEVA, única — spec §10) ────────────────

type BrandObjectivesInput = Pick<
  BrandProfile,
  'main_priority' | 'differentiation' | 'service_to_promote' | 'main_services' | 'shows_face'
> | null

export function buildObjectivesGrammar(
  brand: BrandObjectivesInput,
  reto: { level: string | null; status: string; current_day: number; current_phase: number; posts_per_week: number } | null,
  phaseTitle: string | null,
): string | null {
  if (!brand && !reto) return null
  const lines: string[] = []

  const priority = brand?.main_priority
    ? PRIORITY_LABELS[brand.main_priority]
    : 'Sin prioridad marcada — mix equilibrado'
  lines.push(`PRIORIDAD DE LA USUARIA: ${priority}`)

  if (brand?.differentiation) {
    lines.push(`LO QUE QUIEREN QUE VALOREN: ${brand.differentiation}`)
  }

  const star = brand?.service_to_promote
  const others = (brand?.main_services || []).filter(s => s && s !== star).slice(0, 3)
  if (star || others.length) {
    const list = [star ? `${star} (estrella)` : null, ...others].filter(Boolean).join(' · ')
    lines.push(`SERVICIOS ESTRELLA: ${list}`)
  }

  if (reto) {
    if (reto.level) lines.push(`NIVEL: ${reto.level}`)
    if (reto.status === 'active') {
      const phase = phaseTitle ? ` — ${phaseTitle}` : ''
      lines.push(`PROGRESO: DÍA ${reto.current_day} de 30 · FASE ${reto.current_phase}${phase} · ${reto.posts_per_week}/semana`)
    }
  }

  const face = brand?.shows_face
  if (face === 'work_only' || face === 'no') {
    lines.push('RESTRICCIÓN DE PRODUCCIÓN: la estilista NO sale a cámara. Piezas sin su rostro (manos, proceso, antes/después, producto, voz en off).')
  } else if (face === 'appear') {
    lines.push('RESTRICCIÓN DE PRODUCCIÓN: la estilista aparece en imagen pero prefiere NO hablar a cámara. Voz en off, texto en pantalla o narración.')
  }

  lines.push('(Nota: estas prioridades ACTIVAS actualizan y sustituyen cualquier objetivo, servicio o edad desactualizados de la sección de marca.)')

  return lines.join('\n')
}

// ── Anti-drift determinista (spec §9) ───────────────────────────────

type BrandLiveInput = Pick<
  BrandProfile,
  'main_priority' | 'differentiation' | 'main_services' | 'service_to_promote' | 'shows_face' | 'strategy_json' | 'updated_at'
> | null

export function buildLiveUpdateLine(brand: BrandLiveInput): string | null {
  if (!brand) return null
  const bits: string[] = []
  if (brand.main_priority) bits.push(`prioridad: ${PRIORITY_LABELS[brand.main_priority]}`)
  if (brand.differentiation) bits.push(`lo que valoran de ti: ${brand.differentiation}`)
  if (brand.main_services?.length) bits.push(`servicios: ${brand.main_services.join(', ')}`)
  if (brand.service_to_promote) bits.push(`estrella: ${brand.service_to_promote}`)
  if (brand.shows_face) bits.push(`cámara: ${SHOWS_FACE_LABELS[brand.shows_face]}`)
  if (bits.length === 0) return null

  let line = `ACTUALIZACIÓN EN CALIENTE (verdad actual, manda sobre todo lo anterior): ${bits.join(' · ')}`

  // Nota stale: si la estrategia se generó antes del último cambio de marca.
  const raw = brand.strategy_json as Record<string, unknown> | null
  const generatedAt = typeof raw?.strategy_generated_at === 'string' ? raw.strategy_generated_at : null
  if (generatedAt && brand.updated_at && generatedAt < brand.updated_at) {
    line += ' (OJO: la estrategia generada es anterior a estos datos — actualízala mentalmente.)'
  }
  return line
}