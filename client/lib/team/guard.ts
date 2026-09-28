import { NextResponse, type NextRequest } from 'next/server'

/**
 * Guard del Modo Equipo (Fase 0 — hardening sin romper la UI).
 *
 * Se aplica centralizadamente en middleware.ts a todas las rutas
 * /team/api/* y /api/team/*.
 *
 * - Modo ESTRICTO (TEAM_API_TOKEN configurado): exige el header
 *   `x-team-token` con el valor correcto. Para activarlo: definir
 *   TEAM_API_TOKEN en Vercel y añadir el header a los fetch del Modo
 *   Equipo (o migrar a auth real de Supabase — recomendado a medio plazo).
 * - Modo FLEXIBLE (sin token configurado): bloquea peticiones cross-site
 *   (`sec-fetch-site: cross-site`), mantiene same-origin operativo para
 *   no romper los fetch ni el iframe de finanzas.
 *
 * Limitación honesta: el modo flexible NO es autenticación real — el
 * `actorId` del body sigue siendo el mecanismo interno de identidad.
 * No ampliar superficie de datos sobre este patrón (ver CLAUDE.md §8).
 */

export const TEAM_API_TOKEN_HEADER = 'x-team-token'

export type TeamGuardResult =
  | { ok: true }
  | { ok: false; res: NextResponse }

export function isTeamApiPath(pathname: string): boolean {
  return pathname.startsWith('/team/api/') || pathname.startsWith('/api/team/')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function verifyTeamRequest(request: NextRequest): TeamGuardResult {
  const token = process.env.TEAM_API_TOKEN

  if (token) {
    const provided = request.headers.get(TEAM_API_TOKEN_HEADER)
    if (!provided || !safeEqual(provided, token)) {
      return {
        ok: false,
        res: NextResponse.json({ error: 'Team auth required' }, { status: 401 }),
      }
    }
    return { ok: true }
  }

  // Modo flexible: bloquear solo peticiones cross-site explícitas.
  const site = request.headers.get('sec-fetch-site')
  if (site === 'cross-site') {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Cross-site requests not allowed' }, { status: 403 }),
    }
  }
  return { ok: true }
}