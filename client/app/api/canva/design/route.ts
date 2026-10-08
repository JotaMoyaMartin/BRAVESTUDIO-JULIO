import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  CanvaError,
  ensureFreshToken,
  getDesign,
  getDesignDataset,
  parseDesignRef,
} from '@/lib/integrations/canva'

/**
 * Import de un diseño Canva para el Admin: id/URL → metadata + dataset de
 * campos Autofill. Solo ADMIN. Devuelve el shape que el mapper consume.
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, userId: user.id }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const ref = request.nextUrl.searchParams.get('ref') ?? ''
  const designId = parseDesignRef(ref)
  if (!designId) {
    return NextResponse.json({ error: 'Ref de diseño inválida — pega el Design ID (DA...) o su URL.' }, { status: 400 })
  }

  try {
    const { accessToken } = await ensureFreshToken(auth.userId)
    const design = await getDesign({ accessToken, designId })
    const dataset = await getDesignDataset({ accessToken, designId })
    return NextResponse.json({ design, dataset })
  } catch (err) {
    if (err instanceof CanvaError) {
      // Mensajes admins comprensibles (33 del brief): técnico solo al admin.
      const human: Record<string, string> = {
        not_found: 'El diseño no existe o está en otra cuenta de Canva.',
        permission_denied: 'La cuenta conectada no tiene acceso a ese diseño.',
        design_not_fillable: 'Ese diseño no tiene campos de Data Autofill.',
        timeout: 'Canva tardó demasiado en responder — reintenta.',
        too_many_requests: 'Límite de peticiones a Canva — espera unos segundos.',
      }
      return NextResponse.json({ error: human[err.code] ?? err.message, code: err.code }, { status: err.status >= 500 ? 502 : err.status })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}