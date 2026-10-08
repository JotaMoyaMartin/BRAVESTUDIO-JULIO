import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  disconnectConnection,
  getConnectionRow,
  isCanvaConfigured,
} from '@/lib/integrations/canva'
import { isSocialCryptoConfigured } from '@/lib/crypto'

/**
 * Estado de la conexión Canva del equipo y desconexión/revoke.
 * Solo ADMIN. Tokens nunca en la respuesta (solo metadata + fechas).
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, msg: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return { ok: false as const, status: 403, msg: 'Sin permisos' }
  }
  return { ok: true as const, userId: user.id }
}

function connectionStatusRow(row: Awaited<ReturnType<typeof getConnectionRow>>) {
  if (!row) return null
  const expiresAt = row.expires_at
  const expired = new Date(expiresAt).getTime() <= Date.now()
  return {
    id: row.id,
    status: row.status,
    scopes: (row.scopes || '').split(' ').filter(Boolean),
    expiresAt,
    expired,
    lastRefreshedAt: row.last_refreshed_at,
    lastError: row.last_error,
    account: row.account_metadata ?? null,
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  if (!isCanvaConfigured() || !isSocialCryptoConfigured()) {
    return NextResponse.json({ connected: false, configured: false })
  }
  try {
    const row = await getConnectionRow(auth.userId)
    return NextResponse.json({ connected: Boolean(row), configured: true, connection: connectionStatusRow(row) })
  } catch (err) {
    return NextResponse.json({ connected: false, configured: true, error: (err as Error).message }, { status: 200 })
  }
}

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })
  try {
    await disconnectConnection(auth.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}