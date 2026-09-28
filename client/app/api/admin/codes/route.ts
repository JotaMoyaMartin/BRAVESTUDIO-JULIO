import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * CRUD de códigos promocionales para el admin (Fase 0).
 *
 * Antes CodesTab ('use client') usaba createAdminClient directamente en el
 * navegador — SUPABASE_SERVICE_ROLE_KEY no está disponible en el bundle y el
 * CRUD estaba roto en producción. Ahora pasa por esta API route con
 * verificación de rol server-side (mismo patrón requireAdmin del resto).
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, res: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  }
  return { ok: true as const, user }
}

// ── POST: crear código ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const body = await req.json().catch(() => null)
  if (!body || typeof body.code !== 'string' || !body.code.trim()) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }

  const insert = {
    code: body.code.trim().toUpperCase(),
    description: body.description || null,
    access_days: typeof body.access_days === 'number' ? body.access_days : 30,
    max_redemptions: body.max_redemptions ? parseInt(body.max_redemptions) : null,
    expires_at: body.expires_at || null,
    code_type: body.code_type === 'skool' ? 'skool' : 'promo',
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('promo_codes').insert(insert).select().single()
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'No se pudo crear' }, { status: 500 })
  }
  return NextResponse.json({ code: data })
}

// ── PATCH: actualizar código (datos o toggle activo) ─────────────
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if ('description' in body) update.description = body.description || null
  if (typeof body.access_days === 'number') update.access_days = body.access_days
  if ('max_redemptions' in body) update.max_redemptions = body.max_redemptions ? parseInt(body.max_redemptions) : null
  if ('expires_at' in body) update.expires_at = body.expires_at || null
  if (body.code_type === 'promo' || body.code_type === 'skool') update.code_type = body.code_type

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('promo_codes').update(update).eq('id', body.id).select().single()
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'No se pudo actualizar' }, { status: 500 })
  }
  return NextResponse.json({ code: data })
}

// ── DELETE: eliminar código ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('promo_codes').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}