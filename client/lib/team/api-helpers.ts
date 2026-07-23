import { createAdminClient } from '@/lib/supabase/admin'
import { USERS, TEAM } from './mock-data'
import { buildBrandFullContext } from '@/lib/ai/brand-context'
import type { Client } from './types'

/**
 * Helpers compartidos por los route handlers del Modo Equipo.
 * El Modo Equipo usa auth mock (localStorage), por lo que las APIs internas
 * confían en un `actorId` enviado en el body y lo validan contra USERS/TEAM.
 */

export interface Actor {
  userId: string      // u-jota, u-nahir, ...
  memberId: string    // tm-jota, ...
  role: 'admin' | 'cm' | 'editor' | 'designer'
  name: string
}

export function resolveActor(actorId: string | undefined | null): Actor | null {
  if (!actorId) return null
  const user = USERS.find(u => u.id === actorId)
  if (!user) return null
  const member = TEAM.find(t => t.id === user.memberId) || null
  if (!member) return null
  return {
    userId: user.id,
    memberId: member.id,
    role: member.role as Actor['role'],
    name: member.name,
  }
}

/** Un actor puede gestionar ideas/métricas si es admin o CM. */
export function canManageStrategy(actor: Actor | null): boolean {
  return !!actor && (actor.role === 'admin' || actor.role === 'cm')
}

/**
 * Recupera el `supabase_user_id` de un cliente del Modo Equipo a partir
 * del mock CLIENTS. Si el cliente no está mapeado a una cuenta premium
 * real, devuelve null.
 */
export function findClientSupabaseId(clientId: string): string | null {
  // Import dinámico para evitar ciclo con mock-data en otros consumidores.
  const { CLIENTS } = require('./mock-data') as typeof import('./mock-data')
  const c = CLIENTS.find(x => x.id === clientId)
  return c?.supabase_user_id || null
}

/**
 * Inverso de findClientSupabaseId: dado un supabase_user_id, encuentra
 * el clientId del Modo Equipo. Útil cuando partimos de una idea que solo
 * tiene user_id de Supabase.
 */
export function findClientIdBySupabaseId(supabaseUserId: string): string | null {
  const { CLIENTS } = require('./mock-data') as typeof import('./mock-data')
  const c = CLIENTS.find(x => x.supabase_user_id === supabaseUserId)
  return c?.id || null
}

/**
 * Construye el brand context (texto plano) que se inyecta en los prompts
 * de IA a partir del `brand_profiles` de la clienta premium en Supabase.
 * Si no hay brand_profile, usa los datos del cliente del Modo Equipo como fallback.
 */
export async function buildBrandContextForUser(supabaseUserId: string, clientId?: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('brand_profiles')
    .select('salon_name, optimized_summary, service_to_promote, main_services, strategy_json, raw_input')
    .eq('user_id', supabaseUserId)
    .maybeSingle()
  if (!error && data) {
    const ctx = buildBrandFullContext({
      salon_name: data.salon_name as string | null,
      optimized_summary: data.optimized_summary as string | null,
      service_to_promote: data.service_to_promote as string | null,
      main_services: data.main_services as string[] | null,
      strategy_json: data.strategy_json as Record<string, unknown> | null,
      raw_input: data.raw_input as string | null,
    })
    if (ctx) return ctx
  }

  // Fallback: usar datos del cliente del Modo Equipo (mock-data)
  if (clientId) {
    const fallback = buildFallbackBrandContext(clientId)
    if (fallback) return fallback
  }

  return null
}

/**
 * Construye un brand context mínimo a partir de los datos del cliente
 * del Modo Equipo (mock-data) cuando no hay brand_profile en Supabase.
 */
function buildFallbackBrandContext(clientId: string): string | null {
  const { CLIENTS } = require('./mock-data') as typeof import('./mock-data')
  const c: Client | undefined = CLIENTS.find(x => x.id === clientId)
  if (!c) return null

  const parts: string[] = []
  parts.push(`SALÓN: ${c.salonName}`)
  parts.push(`CIUDAD: ${c.city}`)
  parts.push(`INSTAGRAM: ${c.instagram}`)
  if (c.mainServices && c.mainServices.length > 0) {
    parts.push(`SERVICIOS PRINCIPALES: ${c.mainServices.join(', ')}`)
  }
  if (c.promoteService) {
    parts.push(`⭐ SERVICIO A PROMOCIONAR PRIORITARIAMENTE: ${c.promoteService}`)
  }
  if (c.tone) {
    parts.push(`TONO DE COMUNICACIÓN: ${c.tone}`)
  }
  if (c.objectives) {
    parts.push(`OBJETIVOS: ${c.objectives}`)
  }
  if (c.observations) {
    parts.push(`OBSERVACIONES DEL EQUIPO: ${c.observations}`)
  }
  if (c.postFrequency) {
    parts.push(`FRECUENCIA DE PUBLICACIÓN: ${c.postFrequency}`)
  }
  return parts.join('\n').trim()
}