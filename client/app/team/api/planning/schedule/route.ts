import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActor, canManageStrategy, findClientSupabaseId } from '@/lib/team/api-helpers'
import { normalizeMediaUrl, schedulePost, type MetricoolCreds } from '@/lib/metricool/client'

interface PubInput {
  publicationId: string
  mediaUrl: string
  caption: string
  scheduledDate: string       // ISO datetime
  networks: string[]
  type: 'reel' | 'carrusel'
}

/**
 * POST /team/api/planning/schedule
 * Body: { actorId, clientId, planningId, publications: PubInput[] }
 *
 * Programa cada publicación a las redes seleccionadas vía Metricool.
 * Requiere metricool_config de la clienta. Persiste el resultado en
 * team_scheduled_posts (upsert por publication_id + network).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actorId, clientId, planningId, publications } = body as {
    actorId?: string
    clientId?: string
    planningId?: string
    publications?: PubInput[]
  }

  const actor = resolveActor(actorId)
  if (!canManageStrategy(actor)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (!clientId || !planningId) {
    return NextResponse.json({ error: 'clientId y planningId requeridos' }, { status: 400 })
  }
  if (!Array.isArray(publications) || publications.length === 0) {
    return NextResponse.json({ error: 'No hay publicaciones que programar' }, { status: 400 })
  }

  const supabaseUserId = findClientSupabaseId(clientId)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Cliente no mapeado a cuenta premium' }, { status: 400 })
  }

  // Cargar creds de Metricool
  const admin = createAdminClient()
  const { data: cfgRow, error: cfgErr } = await admin
    .from('metricool_config')
    .select('user_token, metricool_user_id, blog_id, networks')
    .eq('user_id', supabaseUserId)
    .maybeSingle()

  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 })
  }
  if (!cfgRow || !cfgRow.user_token || !cfgRow.metricool_user_id || !cfgRow.blog_id) {
    return NextResponse.json(
      { error: 'Configura Metricool primero en la pestaña Métricas' },
      { status: 400 }
    )
  }

  const creds: MetricoolCreds = {
    userToken: cfgRow.user_token,
    userId: cfgRow.metricool_user_id,
    blogId: cfgRow.blog_id,
  }

  const results: Array<{
    publicationId: string
    network: string
    status: 'scheduled' | 'failed'
    postId?: string | null
    error?: string
  }> = []

  const now = new Date().toISOString()

  // Procesar cada publicación
  for (const pub of publications) {
    if (!pub.mediaUrl?.trim() || !pub.scheduledDate || !pub.networks?.length) {
      for (const net of pub.networks || []) {
        results.push({
          publicationId: pub.publicationId,
          network: net,
          status: 'failed',
          error: 'Falta mediaUrl, scheduledDate o networks',
        })
      }
      continue
    }

    // Normalizar media URL
    const mediaUrl = await normalizeMediaUrl(creds, pub.mediaUrl.trim())

    // Tipo de publicación IG según type
    const igType: 'REEL' | 'POST' = pub.type === 'reel' ? 'REEL' : 'POST'

    // Llamar a Metricool
    const postResults = await schedulePost(creds, {
      caption: pub.caption || '',
      publicationDate: pub.scheduledDate,
      providers: pub.networks,
      mediaUrl,
      instagramType: igType,
    })

    // Persistir cada red
    for (const r of postResults) {
      if (r.status === 'scheduled' && r.postId) {
        await admin.from('team_scheduled_posts').upsert({
          client_user_id: supabaseUserId,
          planning_id: planningId,
          publication_id: pub.publicationId,
          network: r.network,
          metricool_post_id: r.postId,
          status: 'scheduled',
          scheduled_at: pub.scheduledDate,
          media_url: pub.mediaUrl.trim(),
          caption: pub.caption || '',
          error: null,
          updated_at: now,
        }, { onConflict: 'publication_id,network' })
      } else {
        await admin.from('team_scheduled_posts').upsert({
          client_user_id: supabaseUserId,
          planning_id: planningId,
          publication_id: pub.publicationId,
          network: r.network,
          metricool_post_id: null,
          status: 'failed',
          scheduled_at: pub.scheduledDate,
          media_url: pub.mediaUrl.trim(),
          caption: pub.caption || '',
          error: r.error || 'Error desconocido',
          updated_at: now,
        }, { onConflict: 'publication_id,network' })
      }

      results.push({
        publicationId: pub.publicationId,
        network: r.network,
        status: r.status,
        postId: r.postId,
        error: r.error,
      })
    }
  }

  return NextResponse.json({ results })
}