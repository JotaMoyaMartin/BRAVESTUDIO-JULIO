'use client'
/**
 * Admin → Clientes del servicio: lo que mandan (material e ideas) y su
 * calendario de publicaciones («Lo que publicamos» en su app).
 */
import { useCallback, useEffect, useState } from 'react'
import { Download, ExternalLink, ImagePlus, Lightbulb, Loader2 } from 'lucide-react'
import type { Peticion, PeticionEstado } from '@/lib/equipo/types'

type Perfil = { id: string; email: string | null; full_name: string | null; salon_name: string | null }
type PeticionAdmin = Peticion & { perfil: Perfil | null }

const PET_LABEL: Record<PeticionEstado, string> = { nueva: 'Nueva', 'en-marcha': 'En marcha', hecha: 'Hecha' }
const when = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const who = (p: Perfil | null) => p?.salon_name || p?.full_name || p?.email || 'Clienta'

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const j = await res.json().catch(() => ({}))
  if (j.missingTable) throw new Error('missing')
  if (!res.ok) throw new Error(j.error || 'Error')
  return j as T
}

export default function EquipoTab() {
  const [missing, setMissing] = useState(false)
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Material e ideas de las clientas</h2>
        <p className="text-[14px] text-tinta-2">Lo que envían desde «Mi equipo BRÄVE». Lo que publicáis lo ven en su app desde la planificación del panel del equipo.</p>
      </div>
      {missing
        ? <section className="card p-6"><p className="text-[15px] text-ink">Pega en Supabase (SQL Editor) el archivo <strong>SQL-CLIENTES-SERVICIO.sql</strong> y vuelve a cargar.</p></section>
        : <>
          <Enlaces />
          <Peticiones onMissing={() => setMissing(true)} />
        </>}
    </div>
  )
}

function Peticiones({ onMissing }: { onMissing: () => void }) {
  const [filtro, setFiltro] = useState<PeticionEstado | 'todas'>('nueva')
  const [list, setList] = useState<PeticionAdmin[] | null>(null)
  const load = useCallback(async () => {
    setList(null)
    try { setList((await api<{ peticiones: PeticionAdmin[] }>(`/api/admin/equipo?vista=peticiones${filtro === 'todas' ? '' : `&estado=${filtro}`}`)).peticiones) }
    catch (e) { if ((e as Error).message === 'missing') onMissing(); else setList([]) }
  }, [filtro, onMissing])
  useEffect(() => { load() }, [load])

  async function update(p: PeticionAdmin, patch: { estado?: PeticionEstado; respuesta?: string }) {
    await api('/api/admin/equipo', { accion: 'peticion', id: p.id, ...patch })
    setList(l => l?.map(x => (x.id === p.id ? { ...x, ...patch } : x)) ?? null)
  }
  async function open(path: string, descargar = false) {
    const { url } = await api<{ url: string }>('/api/admin/equipo', { accion: 'archivo', path, descargar })
    window.open(url, '_blank', 'noopener')
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['nueva', 'en-marcha', 'hecha', 'todas'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`chip ${filtro === f ? '!bg-burdeos !text-crema' : ''}`}>{f === 'todas' ? 'Todas' : PET_LABEL[f]}</button>
        ))}
      </div>
      {list === null ? <div className="h-24 rounded-2xl bg-white/60 animate-pulse" />
        : !list.length ? <p className="card p-5 text-[15px] text-tinta-2">No hay nada {filtro === 'todas' ? '' : `«${PET_LABEL[filtro as PeticionEstado].toLowerCase()}»`}.</p>
        : list.map(p => <PeticionCard key={p.id} p={p} onUpdate={patch => update(p, patch)} onOpen={open} />)}
    </section>
  )
}

function PeticionCard({ p, onUpdate, onOpen }: { p: PeticionAdmin; onUpdate: (patch: { estado?: PeticionEstado; respuesta?: string }) => Promise<void>; onOpen: (path: string, dl?: boolean) => Promise<void> }) {
  const [resp, setResp] = useState(p.respuesta ?? '')
  const [saving, setSaving] = useState(false)
  return (
    <article className="card p-4 sm:p-5 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.tipo === 'material' ? 'bg-rosa/60' : 'bg-mantequilla'} text-burdeos`}>{p.tipo === 'material' ? <ImagePlus size={17} /> : <Lightbulb size={17} />}</span>
          <div>
            <p className="text-[15px] font-semibold text-ink">{who(p.perfil)}</p>
            <p className="text-[12px] text-tinta-2">{p.tipo === 'material' ? 'Material' : 'Idea'} · {when(p.created_at)}{p.origen?.seccion ? ` · desde ${p.origen.seccion}` : ''}</p>
          </div>
        </div>
        <select value={p.estado} onChange={e => onUpdate({ estado: e.target.value as PeticionEstado })} className="input-field !w-auto !py-1.5 text-[14px]" aria-label="Estado">
          {(Object.keys(PET_LABEL) as PeticionEstado[]).map(k => <option key={k} value={k}>{PET_LABEL[k]}</option>)}
        </select>
      </header>
      {p.titulo && <p className="text-[16px] font-semibold text-ink">{p.titulo}</p>}
      {p.mensaje && <p className="text-[15px] text-ink whitespace-pre-line">{p.mensaje}</p>}
      {p.origen?.texto && <details className="rounded-xl bg-warm-gray/60 p-3 text-[14px]"><summary className="cursor-pointer font-semibold text-tinta-2">Ver el texto completo</summary><p className="mt-2 whitespace-pre-line text-ink break-words">{p.origen.texto}</p></details>}
      {p.archivos.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {p.archivos.map(a => (
            <li key={a.path} className="flex items-center gap-2 rounded-xl bg-warm-gray/60 px-3 py-2 text-[14px]">
              <span className="flex-1 min-w-0 truncate text-ink">{a.name}</span>
              <button onClick={() => onOpen(a.path)} className="text-cereza" aria-label={`Ver ${a.name}`}><ExternalLink size={15} /></button>
              <button onClick={() => onOpen(a.path, true)} className="text-cereza" aria-label={`Descargar ${a.name}`}><Download size={15} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={resp} onChange={e => setResp(e.target.value)} placeholder="Respuesta para la clienta (la verá en su app)" className="input-field flex-1 text-[14px]" />
        <button disabled={saving || resp === (p.respuesta ?? '')} onClick={async () => { setSaving(true); await onUpdate({ respuesta: resp }); setSaving(false) }} className="btn-ghost text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
        </button>
      </div>
    </article>
  )
}

/** Enlaza cada clienta del panel del equipo con su cuenta de la app (para que vea su planificación). */
function Enlaces() {
  const [data, setData] = useState<{ clientes: Array<{ id: string; name: string; salonName: string; supabase_user_id: string | null }>; cuentas: Perfil[] } | null>(null)
  const [open, setOpen] = useState(false)
  const load = useCallback(async () => { try { setData(await api('/api/admin/equipo?vista=enlaces')) } catch { setData({ clientes: [], cuentas: [] }) } }, [])
  useEffect(() => { if (open && !data) load() }, [open, data, load])
  const sinEnlace = data?.clientes.filter(c => !c.supabase_user_id).length ?? 0
  return (
    <details className="card p-4 sm:p-5" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-[15px] font-semibold text-ink">Enlazar clientas con su cuenta de la app {data ? `· ${sinEnlace} sin enlazar` : ''}</summary>
      <p className="mt-1 text-[13px] text-tinta-2">Así ven en «Lo que publicamos» la planificación que les preparáis. Las clientas salen del panel del equipo; las cuentas, de las usuarias con rol premium.</p>
      {!data ? <div className="mt-3 h-16 rounded-xl bg-white/60 animate-pulse" />
        : !data.clientes.length ? <p className="mt-3 text-[14px] text-tinta-2">Aún no hay clientas en la base de datos: entra una vez en el panel del equipo para cargarlas.</p>
        : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.clientes.map(c => (
              <li key={c.id} className="flex items-center gap-2 rounded-xl bg-warm-gray/50 px-3 py-2">
                <span className="flex-1 min-w-0 truncate text-[14px] text-ink">{c.name}{c.salonName ? ` · ${c.salonName}` : ''}</span>
                <select value={c.supabase_user_id ?? ''} aria-label={`Cuenta de ${c.name}`}
                  onChange={async e => { await api('/api/admin/equipo', { accion: 'enlazar', client_id: c.id, user_id: e.target.value || null }); load() }}
                  className="input-field !w-44 !py-1.5 text-[13px]">
                  <option value="">Sin enlazar</option>
                  {data.cuentas.map(u => <option key={u.id} value={u.id}>{who(u)}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
    </details>
  )
}
