/**
 * ACCESO SKOOL (23-oct-2026) · lógica pura.
 * Las alumnas entran solo con su email. Tienen acceso si su email está en la
 * lista de miembros de Skool que Jota sube desde el admin (exportación CSV).
 * Si alguien desaparece de la lista, pierde el acceso tras unos días de margen.
 */

export const GRACE_DAYS = 7
/** Si la lista nueva tiene menos de esta parte de las activas, se pide confirmar (evita borrar a todas por error). */
export const SAFETY_RATIO = 0.6

export function normalizeEmail(e: string): string {
  return (e || '').trim().toLowerCase()
}

const EMAIL_RE = /^[^\s@,;"']+@[^\s@,;"']+\.[a-z]{2,}$/i

export function isEmail(e: string): boolean {
  return EMAIL_RE.test(normalizeEmail(e))
}

/** Separa una línea de CSV respetando comillas. */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === sep) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export interface SkoolRow { email: string; name: string | null }

/**
 * Lee la exportación de miembros de Skool (o cualquier CSV/lista con emails).
 * Busca la columna de email por su cabecera; si no hay cabecera, busca emails
 * en cualquier columna. Quita duplicados.
 */
export function parseSkoolCsv(text: string): { rows: SkoolRow[]; invalid: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { rows: [], invalid: 0 }
  const first = lines[0]
  const sep = [',', ';', '\t'].map(s => [s, first.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const header = splitCsvLine(first, sep).map(h => h.toLowerCase())
  const emailCol = header.findIndex(h => /e-?mail|correo/.test(h))
  const hasHeader = emailCol >= 0 || !header.some(isEmail)
  const firstName = header.findIndex(h => /^(first ?name|nombre)$/.test(h))
  const lastName = header.findIndex(h => /^(last ?name|apellidos?)$/.test(h))
  const fullName = header.findIndex(h => /^(name|full ?name|nombre completo)$/.test(h))

  const seen = new Map<string, SkoolRow>()
  let invalid = 0
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const cells = splitCsvLine(line, sep)
    const raw = emailCol >= 0 ? cells[emailCol] ?? '' : cells.find(isEmail) ?? ''
    const email = normalizeEmail(raw)
    if (!isEmail(email)) { invalid++; continue }
    const name = fullName >= 0 ? cells[fullName] : [cells[firstName], cells[lastName]].filter(Boolean).join(' ')
    if (!seen.has(email)) seen.set(email, { email, name: name?.trim() || null })
  }
  return { rows: [...seen.values()], invalid }
}

export interface MemberDiff {
  /** En la lista nueva y no estaban (o estaban de baja). */
  nuevas: string[]
  /** En la lista nueva y ya estaban activas. */
  siguen: string[]
  /** Activas antes y ya no están en la lista. */
  bajas: string[]
  /** La lista nueva es sospechosamente corta: pedir confirmación. */
  sospechosa: boolean
}

export function diffMembers(fileEmails: string[], activeBefore: string[]): MemberDiff {
  const file = new Set(fileEmails.map(normalizeEmail))
  const before = new Set(activeBefore.map(normalizeEmail))
  const nuevas = [...file].filter(e => !before.has(e))
  const siguen = [...file].filter(e => before.has(e))
  const bajas = [...before].filter(e => !file.has(e))
  return { nuevas, siguen, bajas, sospechosa: before.size >= 10 && file.size < before.size * SAFETY_RATIO }
}

/** Fecha en la que pierde el acceso alguien que deja de estar en la lista. */
export function graceUntil(now = new Date()): string {
  return new Date(now.getTime() + GRACE_DAYS * 86_400_000).toISOString()
}
