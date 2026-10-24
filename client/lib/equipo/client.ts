'use client'
/** Mi equipo BRÄVE · navegador. En modo demo (sin Supabase) se guarda en este navegador. */
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'
import { MAX_FILES, MAX_FILE_MB, type Archivo, type Peticion } from './types'

const DEMO_KEY = 'brave_demo_peticiones'

function demoList(): Peticion[] {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]') as Peticion[] } catch { return [] }
}
function demoAdd(p: Omit<Peticion, 'id' | 'user_id' | 'estado' | 'respuesta' | 'created_at'>): Peticion {
  const full: Peticion = { ...p, id: `demo-${Date.now()}`, user_id: 'demo', estado: 'nueva', respuesta: null, created_at: new Date().toISOString() }
  try { localStorage.setItem(DEMO_KEY, JSON.stringify([full, ...demoList()].slice(0, 50))) } catch { /* sin storage */ }
  return full
}

export class EquipoError extends Error {}

export async function listPeticiones(): Promise<{ peticiones: Peticion[]; missingTable?: boolean }> {
  if (IS_DEMO) return { peticiones: demoList() }
  const res = await fetch('/api/equipo')
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new EquipoError(j.error || 'No se ha podido cargar.')
  return j
}

export async function sendIdea(input: { titulo?: string; mensaje?: string; origen?: { seccion?: string; texto?: string } }): Promise<Peticion> {
  if (IS_DEMO) return demoAdd({ tipo: 'idea', titulo: input.titulo ?? null, mensaje: input.mensaje ?? null, archivos: [], origen: input.origen ?? null })
  const res = await fetch('/api/equipo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'enviar', tipo: 'idea', ...input }) })
  const j = await res.json().catch(() => ({}))
  if (j.missingTable) throw new EquipoError('Esta sección aún no está activada. Avisa a tu equipo BRÄVE.')
  if (!res.ok) throw new EquipoError(j.error || 'No se ha podido enviar.')
  return j.peticion
}

/** Sube fotos/vídeos directo al almacenamiento y crea la petición. onProgress: archivos subidos. */
export async function sendMaterial(files: File[], mensaje: string, onProgress?: (done: number, total: number) => void): Promise<Peticion> {
  if (!files.length) throw new EquipoError('Elige al menos una foto o un vídeo.')
  if (files.length > MAX_FILES) throw new EquipoError(`Como mucho ${MAX_FILES} archivos por envío.`)
  const big = files.find(f => f.size > MAX_FILE_MB * 1024 * 1024)
  if (big) throw new EquipoError(`«${big.name}» pesa más de ${MAX_FILE_MB} MB. Para vídeos largos, mándalo por WhatsApp a tu equipo o recórtalo.`)
  const meta = files.map(f => ({ name: f.name, size: f.size, type: f.type }))
  if (IS_DEMO) {
    files.forEach((_, i) => onProgress?.(i + 1, files.length))
    return demoAdd({ tipo: 'material', titulo: null, mensaje: mensaje || null, archivos: meta.map((m, i) => ({ ...m, path: `demo/${i}` })), origen: null })
  }
  const res = await fetch('/api/equipo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'subir', archivos: meta }) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new EquipoError(j.error || 'No se ha podido preparar la subida.')
  const supabase = createClient()
  const subidas = j.subidas as Array<Archivo & { token: string }>
  let done = 0
  for (let i = 0; i < subidas.length; i++) {
    const s = subidas[i]
    const { error } = await supabase.storage.from(j.bucket).uploadToSignedUrl(s.path, s.token, files[i], { contentType: files[i].type })
    if (error) throw new EquipoError(`No se ha podido subir «${files[i].name}». Revisa tu conexión e inténtalo de nuevo.`)
    onProgress?.(++done, subidas.length)
  }
  const res2 = await fetch('/api/equipo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'enviar', tipo: 'material', mensaje, archivos: subidas.map(({ path, name, size, type }) => ({ path, name, size, type })) }),
  })
  const j2 = await res2.json().catch(() => ({}))
  if (j2.missingTable) throw new EquipoError('Esta sección aún no está activada. Avisa a tu equipo BRÄVE.')
  if (!res2.ok) throw new EquipoError(j2.error || 'Se subieron los archivos pero no se pudo avisar al equipo. Inténtalo de nuevo.')
  return j2.peticion
}
