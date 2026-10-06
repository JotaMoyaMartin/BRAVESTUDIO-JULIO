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
  'banco-ganchos',
  'foto-inspo',
  'transiciones-reels',
  'reto-10k',
  'mi-estrategia',
  'plan-contenidos',
  'teleprompter',
  'carrusel',
  'analisis',
]

export async function POST(request: NextRequest) {
  // Modo demo (sin credenciales): nada que trackear.
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')) {
    return NextResponse.json({ ok: true })
  }
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