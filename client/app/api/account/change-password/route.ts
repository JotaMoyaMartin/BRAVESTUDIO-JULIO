import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { passwordChangedEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirm = typeof body.confirm === 'string' ? body.confirm : ''

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }
  if (newPassword !== confirm) {
    return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudo cambiar la contraseña' }, { status: 400 })
  }

  // Email confirmación (fire-and-forget)
  if (user.email) {
    try {
      await sendEmail(user.email, 'Contraseña actualizada — BRÄVE Studio', passwordChangedEmail(user.email))
    } catch (e) {
      console.error('[change-password] email send failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}