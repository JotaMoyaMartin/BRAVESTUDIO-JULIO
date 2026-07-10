import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return null
  return { adminClient: createAdminClient(), actorId: user.id }
}

// GET — list premium scripts for a user
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data, error } = await admin.adminClient
    .from('content_items')
    .select('*')
    .eq('user_id', userId)
    .eq('tag', 'premium-script')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

// POST — create a premium script assigned to a user
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json()
  const { userId, type, service, title, contentJson, visualIdea } = body as {
    userId?: string
    type?: 'reel' | 'carrusel' | 'story'
    service?: string
    title?: string
    contentJson?: Record<string, unknown>
    visualIdea?: string
  }

  if (!userId || !title || !type) {
    return NextResponse.json({ error: 'userId, title y type son obligatorios' }, { status: 400 })
  }

  // Verify target user is premium
  const { data: targetProfile } = await admin.adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile || targetProfile.role !== 'premium') {
    return NextResponse.json({ error: 'El usuario no es premium' }, { status: 400 })
  }

  const { data, error } = await admin.adminClient
    .from('content_items')
    .insert({
      user_id: userId,
      type,
      title,
      service: service || null,
      content_json: contentJson || {},
      visual_idea: visualIdea || null,
      tag: 'premium-script',
      status: 'library',
      caption_with_hashtags: null,
      scheduled_date: null,
      objective: null,
      format: null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await admin.adminClient.rpc('log_user_activity', {
      p_user_id: userId,
      p_event: 'premium_script_assigned',
      p_data: { title, type },
      p_actor: admin.actorId,
    })
  } catch (logErr) {
    console.error('log_user_activity failed:', logErr)
  }

  return NextResponse.json({ ok: true, item: data })
}

// DELETE — remove a premium script
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  const { error } = await admin.adminClient
    .from('content_items')
    .delete()
    .eq('id', itemId)
    .eq('tag', 'premium-script')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}