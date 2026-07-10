import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_SECTIONS = [
  'inicio',
  'planificar',
  'crear-contenido',
  'mi-marca',
  'biblioteca',
  'calendario',
  'stories',
  'inspiracion-reels',
  'transiciones-reels',
  'reto-10k',
  'mi-estrategia',
  'plan-contenidos',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })

  const body = await request.json()
  const section = body?.section as string | undefined
  if (!section || !VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ ok: true })
  }

  await supabase
    .from('profiles')
    .update({ last_visited_section: section })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}