import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PremiumStrategySession } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, admin: createAdminClient(), adminId: user.id }
}

// GET — get session by id
export async function GET(_request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const { data, error } = await auth.admin
    .from('premium_strategy_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data as PremiumStrategySession })
}

// PUT — update transcription or strategy_draft (manual edit)
export async function PUT(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.transcription !== undefined) update.transcription = String(body.transcription).trim()
  if (body.strategy_draft !== undefined) update.strategy_draft = body.strategy_draft

  const { data, error } = await auth.admin
    .from('premium_strategy_sessions')
    .update(update)
    .eq('id', params.sessionId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data as PremiumStrategySession })
}