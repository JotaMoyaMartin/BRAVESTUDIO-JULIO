import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { lesson_id, completed } = body
  if (!lesson_id || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('academia_lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id: String(lesson_id),
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,lesson_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}