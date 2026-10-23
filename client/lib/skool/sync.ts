/**
 * Aplicar la lista de miembros de Skool (desde el admin o desde el agente
 * semanal). Vista previa sin cambios, o aplicar: altas activas, bajas con
 * margen de días y quien vuelve recupera el acceso. Solo servidor.
 */
import type { createAdminClient } from '@/lib/supabase/admin'
import { diffMembers, graceUntil, isEmail, normalizeEmail, type SkoolRow } from './members'

type DB = ReturnType<typeof createAdminClient>

export async function activeEmails(db: DB): Promise<string[]> {
  const out: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('skool_members').select('email').eq('status', 'activo').range(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []).map(r => (r as { email: string }).email))
    if (!data || data.length < 1000) return out
  }
}

type SkoolProfile = { id: string; email: string | null; full_name: string | null; access_expires_at: string | null }

async function skoolProfiles(db: DB): Promise<SkoolProfile[]> {
  const { data, error } = await db.from('profiles').select('id, email, full_name, access_expires_at').eq('access_source', 'skool').limit(5000)
  if (error) throw error
  return (data ?? []) as SkoolProfile[]
}

const chunks = <T,>(a: T[], n = 400) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

export function isMissingTable(e: unknown): boolean {
  return /skool_members|skool_imports|relation|schema cache/i.test(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))
}

export async function syncSkoolList(db: DB, input: SkoolRow[], opts: { apply: boolean; force: boolean; by: string }): Promise<{ status: number; body: Record<string, unknown> }> {
  const rows = input.filter(r => isEmail(r.email)).map(r => ({ email: normalizeEmail(r.email), name: r.name?.slice(0, 120) ?? null }))
  if (!rows.length) return { status: 400, body: { error: 'La lista no tiene emails.' } }
  const fileSet = new Set(rows.map(r => r.email))
  const diff = diffMembers([...fileSet], await activeEmails(db))
  const profiles = await skoolProfiles(db)
  // Alumnas que usan la app (entraron por Skool) y ya no están en la lista.
  const pierden = profiles.filter(p => p.email && !fileSet.has(normalizeEmail(p.email)))
  const vuelven = profiles.filter(p => p.email && fileSet.has(normalizeEmail(p.email)) && p.access_expires_at)

  const preview = {
    total: rows.length,
    nuevas: diff.nuevas.length,
    siguen: diff.siguen.length,
    bajas: diff.bajas.length,
    ejemplosNuevas: diff.nuevas.slice(0, 15),
    pierdenAcceso: pierden.slice(0, 100).map(p => ({ email: p.email, nombre: p.full_name })),
    pierdenTotal: pierden.length,
    vuelven: vuelven.length,
    sospechosa: diff.sospechosa,
  }
  if (!opts.apply) return { status: 200, body: { preview } }
  if (diff.sospechosa && !opts.force) return { status: 409, body: { preview, needsForce: true } }

  const now = new Date().toISOString()
  for (const part of chunks(rows)) {
    const { error } = await db.from('skool_members').upsert(part.map(r => ({ ...r, status: 'activo', last_seen_at: now, removed_at: null })) as never, { onConflict: 'email' })
    if (error) throw error
  }
  for (const part of chunks(diff.bajas)) {
    const { error } = await db.from('skool_members').update({ status: 'baja', removed_at: now } as never).in('email', part)
    if (error) throw error
  }
  // Pierden el acceso al acabar el margen (solo si no tenían ya fecha).
  const until = graceUntil()
  for (const part of chunks(pierden.filter(p => !p.access_expires_at).map(p => p.id))) {
    await db.from('profiles').update({ access_expires_at: until } as never).in('id', part)
  }
  for (const part of chunks(vuelven.map(p => p.id))) {
    await db.from('profiles').update({ access_expires_at: null, access_status: 'active', is_active: true } as never).in('id', part)
  }
  await db.from('skool_imports').insert({ total: rows.length, nuevas: diff.nuevas.length, bajas: diff.bajas.length, by_email: opts.by } as never)
  return { status: 200, body: { preview, applied: true } }
}
