'use client'
/**
 * Admin → Skool: sube la exportación de miembros de Skool. Antes de aplicar
 * ves cuántas entran, cuántas salen y qué alumnas de la app pierden el acceso.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search, Upload, UserPlus } from 'lucide-react'
import { GRACE_DAYS, parseSkoolCsv, type SkoolRow } from '@/lib/skool/members'

type Summary = { activas: number; bajas: number; ultima: { created_at: string; total: number; nuevas: number; bajas: number } | null; missingTable?: boolean }
type Preview = {
  total: number; nuevas: number; siguen: number; bajas: number; ejemplosNuevas: string[]
  pierdenAcceso: Array<{ email: string | null; nombre: string | null }>; pierdenTotal: number; vuelven: number; sospechosa: boolean
}

const when = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function SkoolTab() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<SkoolRow[] | null>(null)
  const [invalid, setInvalid] = useState(0)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState<'preview' | 'apply' | 'add' | 'search' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirmForce, setConfirmForce] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ member: { status: string; last_seen_at: string; removed_at: string | null } | null; profile: { full_name: string | null; access_source: string; access_expires_at: string | null } | null } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { setSummary(await fetch('/api/admin/skool').then(r => r.json())) } catch { /* se ve vacío */ }
  }, [])
  useEffect(() => { load() }, [load])

  async function onFile(f: File | undefined) {
    if (!f) return
    setMsg(null); setPreview(null); setConfirmForce(false)
    const { rows, invalid } = parseSkoolCsv(await f.text())
    setFileName(f.name); setRows(rows); setInvalid(invalid)
    if (!rows.length) { setMsg({ tone: 'error', text: 'No encuentro emails en ese archivo. Sube la exportación de miembros de Skool (CSV).' }); return }
    setBusy('preview')
    const res = await fetch('/api/admin/skool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (j.missingTable) { setSummary(s => ({ ...(s ?? { activas: 0, bajas: 0, ultima: null }), missingTable: true })); return }
    if (!res.ok) { setMsg({ tone: 'error', text: j.error || 'No se ha podido leer la lista.' }); return }
    setPreview(j.preview)
  }

  async function apply() {
    if (!rows) return
    setBusy('apply'); setMsg(null)
    const res = await fetch('/api/admin/skool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, apply: true, force: confirmForce }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (j.needsForce) { setMsg({ tone: 'error', text: 'Esta lista tiene muchas menos alumnas que la anterior. Si es correcta, marca la casilla de confirmar y vuelve a aplicar.' }); return }
    if (!res.ok || !j.applied) { setMsg({ tone: 'error', text: j.error || 'No se ha podido aplicar.' }); return }
    setMsg({ tone: 'ok', text: `Lista aplicada: ${j.preview.nuevas} altas y ${j.preview.bajas} bajas.` })
    setRows(null); setPreview(null); setFileName('')
    load()
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!addEmail.trim()) return
    setBusy('add'); setMsg(null)
    const res = await fetch('/api/admin/skool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ add: addEmail }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    setMsg(res.ok ? { tone: 'ok', text: `${addEmail.trim()} ya puede entrar con su email.` } : { tone: 'error', text: j.error || 'No se ha podido añadir.' })
    if (res.ok) { setAddEmail(''); load() }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy('search')
    setFound(await fetch(`/api/admin/skool?q=${encodeURIComponent(q.trim())}`).then(r => r.json()).catch(() => null))
    setBusy(null)
  }

  if (summary?.missingTable) {
    return (
      <section className="card p-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Falta activar la lista de Skool</h2>
        <p className="text-[15px] text-ink">Pega en Supabase (SQL Editor) el archivo <strong>SQL-ACCESO-SKOOL.sql</strong> y vuelve a cargar esta página.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Alumnas de Skool</h2>
            <p className="text-[14px] text-tinta-2 max-w-xl">Quien está en esta lista entra en la app solo con su email, sin código ni contraseña. Quien sale de la lista pierde el acceso a los {GRACE_DAYS} días.</p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="rounded-2xl bg-[#EAF3EC] px-4 py-2"><p className="text-[22px] font-semibold tabular-nums text-ink">{summary?.activas ?? '—'}</p><p className="text-[12px] text-tinta-2">activas</p></div>
            <div className="rounded-2xl bg-warm-gray px-4 py-2"><p className="text-[22px] font-semibold tabular-nums text-ink">{summary?.bajas ?? '—'}</p><p className="text-[12px] text-tinta-2">de baja</p></div>
          </div>
        </div>
        <p className="text-[13px] text-tinta-2">{summary?.ultima ? `Última lista: ${when(summary.ultima.created_at)} · ${summary.ultima.total} emails (${summary.ultima.nuevas} altas, ${summary.ultima.bajas} bajas)` : 'Aún no has subido ninguna lista.'}</p>

        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy !== null}
          className="w-full rounded-2xl border-2 border-dashed border-borde hover:border-cereza bg-warm-gray/40 py-6 flex flex-col items-center gap-1.5">
          {busy === 'preview' ? <Loader2 size={24} className="animate-spin text-cereza" aria-hidden /> : <Upload size={24} className="text-cereza" aria-hidden />}
          <span className="text-[15px] font-semibold text-ink">{fileName || 'Subir la lista de miembros de Skool (CSV)'}</span>
          <span className="text-[13px] text-tinta-2">En Skool: Miembros → Exportar. Antes de cambiar nada te enseño el resumen.</span>
        </button>

        {msg && <p className={`rounded-2xl p-3.5 text-[14px] ${msg.tone === 'ok' ? 'bg-[#EAF3EC] text-[#1F5C38]' : 'bg-mantequilla/60 text-burdeos'}`} role="status">{msg.text}</p>}

        {preview && (
          <div className="rounded-2xl border border-borde p-4 space-y-3">
            <p className="text-[15px] font-semibold text-ink">Resumen de «{fileName}» · {preview.total} emails{invalid ? ` (${invalid} filas sin email válido)` : ''}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#EAF3EC] p-2"><p className="text-[20px] font-semibold tabular-nums">{preview.nuevas}</p><p className="text-[12px] text-tinta-2">altas</p></div>
              <div className="rounded-xl bg-warm-gray p-2"><p className="text-[20px] font-semibold tabular-nums">{preview.siguen}</p><p className="text-[12px] text-tinta-2">siguen</p></div>
              <div className="rounded-xl bg-rosa/50 p-2"><p className="text-[20px] font-semibold tabular-nums">{preview.bajas}</p><p className="text-[12px] text-tinta-2">bajas</p></div>
            </div>
            {preview.vuelven > 0 && <p className="text-[14px] text-ink">{preview.vuelven} alumnas que estaban de baja vuelven y recuperan el acceso.</p>}
            {preview.pierdenTotal > 0 && (
              <details className="rounded-xl bg-rosa/30 p-3">
                <summary className="text-[14px] font-semibold text-burdeos cursor-pointer">{preview.pierdenTotal} alumnas que usan la app perderán el acceso en {GRACE_DAYS} días</summary>
                <ul className="mt-2 max-h-56 overflow-y-auto text-[13px] text-ink space-y-0.5">
                  {preview.pierdenAcceso.map(p => <li key={p.email}>{p.nombre ? `${p.nombre} · ` : ''}{p.email}</li>)}
                </ul>
                <p className="mt-2 text-[12px] text-tinta-2">Si alguna sigue en Skool con otro email, añádela abajo con su email de la app.</p>
              </details>
            )}
            {preview.sospechosa && (
              <label className="flex gap-2 rounded-xl bg-mantequilla/60 p-3 text-[14px] text-burdeos">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" aria-hidden />
                <span className="flex-1">Esta lista tiene muchas menos alumnas que la que hay ahora. ¿Seguro que es la exportación completa?</span>
                <input type="checkbox" checked={confirmForce} onChange={e => setConfirmForce(e.target.checked)} className="mt-1 accent-[#591427]" aria-label="Confirmo que la lista es correcta" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={apply} disabled={busy !== null || (preview.sospechosa && !confirmForce)} className="btn-primary">
                {busy === 'apply' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CheckCircle2 size={16} aria-hidden />} Aplicar la lista
              </button>
              <button onClick={() => { setPreview(null); setRows(null); setFileName('') }} disabled={busy !== null} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form onSubmit={add} className="card p-5 space-y-3">
          <p className="text-[15px] font-semibold text-ink flex items-center gap-2"><UserPlus size={17} aria-hidden /> Dar acceso a un email</p>
          <p className="text-[13px] text-tinta-2">Para alguien que acaba de entrar en Skool, sin esperar a la próxima lista.</p>
          <div className="flex gap-2">
            <input value={addEmail} onChange={e => setAddEmail(e.target.value)} type="email" placeholder="alumna@email.com" className="input-field flex-1" />
            <button type="submit" disabled={busy !== null} className="btn-primary">{busy === 'add' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : 'Añadir'}</button>
          </div>
        </form>
        <form onSubmit={search} className="card p-5 space-y-3">
          <p className="text-[15px] font-semibold text-ink flex items-center gap-2"><Search size={17} aria-hidden /> Buscar un email</p>
          <div className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} type="email" placeholder="alumna@email.com" className="input-field flex-1" />
            <button type="submit" disabled={busy !== null} className="btn-ghost">{busy === 'search' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : 'Buscar'}</button>
          </div>
          {found && (
            <div className="text-[14px] text-ink space-y-1">
              <p>{found.member ? (found.member.status === 'activo' ? '✓ Está en la lista de Skool' : `✕ De baja desde ${when(found.member.removed_at ?? found.member.last_seen_at)}`) : '✕ No está en la lista de Skool'}</p>
              <p>{found.profile ? `Usa la app${found.profile.full_name ? ` (${found.profile.full_name})` : ''} · acceso por ${found.profile.access_source}${found.profile.access_expires_at ? ` · lo pierde el ${when(found.profile.access_expires_at)}` : ''}` : 'Todavía no ha entrado en la app'}</p>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}
