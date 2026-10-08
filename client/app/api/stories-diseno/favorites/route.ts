import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Favoritos de Stories Diseño — toggle por usuaria (story_design_favorites).
 * GET: { favorites: [templateId…] }. POST {templateId}: alterna y devuelve
 * { ok, active }. Degrada sin romper si la tabla no existe aún.
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ favorites: [] })
  const { data, error } = await supabase
    .from('story_design_favorites')
    .select('template_id')
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ favorites: [] })
  return NextResponse.json({ favorites: ((data as { template_id: string }[]) || []).map(r => r.template_id) })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const body = await request.json().catch(() => null)
  const templateId = body?.templateId
  if (typeof templateId !== 'string' || !templateId) {
    return NextResponse.json({ error: 'Falta templateId' }, { status: 400 })
  }
  const { data: existing } = await supabase
    .from('story_design_favorites')
    .select('template_id')
    .eq('user_id', user.id)
    .eq('template_id', templateId)
    .maybeSingle()
  if (existing) {
    const { error } = await supabase
      .from('story_design_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('template_id', templateId)
    if (error) return NextResponse.json({ ok: false }, { status: 500 })
    return NextResponse.json({ ok: true, active: false })
  }
  const { error } = await supabase
    .from('story_design_favorites')
    .insert({ user_id: user.id, template_id: templateId })
  if (error) return NextResponse.json({ ok: false }, { status: 500 })
  return NextResponse.json({ ok: true, active: true })
}