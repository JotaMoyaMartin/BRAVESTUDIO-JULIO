import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'
import { verifyMetricoolCreds, type MetricoolCreds } from '@/lib/metricool/client'

/**
 * GET /team/api/metricool/config?clientId=...&actorId=...
 *   Devuelve la configuración Metricool de la clienta (sin el token en texto).
 *
 * PUT /team/api/metricool/config
 *   Body: { actorId, clientId, blog_id, user_token, metricool_user_id, networks }
 *   Upsert de metricool_config. Antes de guardar, valida las creds con una
 *   llamada simple; si fallan, devuelve 400 (no guardamos tokens rotos).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const actorId = url.searchParams.get('actorId')

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }
  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('metricool_config')
    .select('user_id, blog_id, metricool_user_id, networks, last_sync_at, created_at, updated_at')
    .eq('user_id', supabaseUserId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // No devolvemos user_token al cliente del Modo Equipo
  return NextResponse.json({ config: data || null, has_token: !!data })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, blog_id, user_token, metricool_user_id, networks } = body as {
    actorId?: string
    clientId?: string
    blog_id?: string
    user_token?: string
    metricool_user_id?: string
    networks?: string[]
  }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }
  if (!blog_id || !user_token || !metricool_user_id) {
    return NextResponse.json({ error: 'Faltan blog_id, user_token o metricool_user_id' }, { status: 400 })
  }
  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  // Validar las creds antes de guardar
  const creds: MetricoolCreds = { userToken: user_token, userId: metricool_user_id, blogId: blog_id }
  const valid = await verifyMetricoolCreds(creds)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas — verifica token, userId y blogId en Metricool' }, { status: 400 })
  }

  const nets = networks && networks.length > 0 ? networks : ['instagram']

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('metricool_config')
    .upsert({
      user_id: supabaseUserId,
      blog_id,
      user_token,
      metricool_user_id,
      networks: nets,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('user_id, blog_id, metricool_user_id, networks, last_sync_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data, ok: true })
}