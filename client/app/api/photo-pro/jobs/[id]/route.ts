import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * FOTO PRO — job individual.
 *
 * GET   → estado + URLs Firmadas (polling desde "Estamos mejorando tu foto")
 *         (si lleva >6 min 'processing' se marca fallida — job huérfano)
 * PATCH → { saved: true } guarda el resultado en "Mis fotos guardadas"
 *
 * RLS de photo_edit_jobs: solo la usuaria ve sus filas (404 si no es suya).
 */
const BUCKET = 'photo-pro'
const SIGNED_URL_TTL = 3600
const STALE_MS = 6 * 60 * 1000

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let row = await loadJob(supabase, params.id, user.id)
  if (!row) return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })

  // Job huérfano (proceso cortado): caduca a fallado de forma segura.
  if (row.status === 'processing' && Date.now() - new Date(row.created_at).getTime() > STALE_MS) {
    const { data: stale } = await supabase
      .from('photo_edit_jobs')
      .update({
        status: 'failed',
        error_code: 'provider_timeout',
        error_message: 'La edición está tardando demasiado. Inténtalo de nuevo.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select()
      .single()
    if (stale) row = stale
  }

  const admin = createAdminClient()
  const [src, res] = await Promise.all([
    admin.storage.from(BUCKET).createSignedUrl(row.asset_path, SIGNED_URL_TTL),
    row.result_path
      ? admin.storage.from(BUCKET).createSignedUrl(row.result_path, SIGNED_URL_TTL)
      : Promise.resolve({ data: null } as unknown as { data: { signedUrl: string } | null }),
  ])

  return NextResponse.json({
    job: {
      ...row,
      source_url: src.data?.signedUrl ?? null,
      result_url: res.data?.signedUrl ?? null,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { saved?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'json_invalido' }, { status: 400 })
  }
  if (typeof body.saved !== 'boolean') {
    return NextResponse.json({ error: 'cuerpo_no_valido' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('photo_edit_jobs')
    .update({ saved: body.saved, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error || !row) return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })
  return NextResponse.json({ job: row })
}

async function loadJob(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data: row } = await supabase
    .from('photo_edit_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return row
}