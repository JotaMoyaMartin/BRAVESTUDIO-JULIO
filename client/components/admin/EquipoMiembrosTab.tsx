'use client'
/**
 * Admin → Equipo BRÄVE: quién entra al panel del equipo (/team) y con qué rol.
 * Cada persona tiene su cuenta; la contraseña temporal se ve una sola vez.
 */
import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Loader2, UserMinus, UserPlus } from 'lucide-react'
import { TEAM } from '@/lib/team/mock-data'

type Miembro = { profile_id: string; member_id: string; name: string; role: string; email: string | null }
const ROLE_LABEL: Record<string, string> = { admin: 'Dirección', cm: 'Community manager', editor: 'Editor/a de vídeo', designer: 'Diseño' }

export default function EquipoMiembrosTab() {
  const [list, setList] = useState<Miembro[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'cm', member_id: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string; password?: string } | null>(null)

  const load = useCallback(async () => {
    const j = await fetch('/api/admin/equipo-miembros').then(r => r.json()).catch(() => ({}))
    if (j.missingTable) setMissing(true)
    setList(j.miembros ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  async function post(body: Record<string, string>) {
    const res = await fetch('/api/admin/equipo-miembros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (j.missingTable) { setMissing(true); throw new Error('Falta el SQL') }
    if (!res.ok) throw new Error(j.error || 'Error')
    return j as { password?: string | null }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const j = await post({ accion: 'crear', ...form })
      setMsg({ tone: 'ok', text: j.password ? `Cuenta creada para ${form.email}. Pásale esta contraseña temporal (solo se ve ahora):` : `${form.name} ya tenía cuenta: ahora es del equipo. Entra con su contraseña de siempre.`, password: j.password ?? undefined })
      setForm({ email: '', name: '', role: 'cm', member_id: '' })
      load()
    } catch (err) { setMsg({ tone: 'error', text: (err as Error).message }) }
    setBusy(false)
  }

  const usados = new Set((list ?? []).map(m => m.member_id))
  const fichas = TEAM.filter(t => !usados.has(t.id))

  if (missing) return <section className="card p-6"><p className="text-[15px] text-ink">Pega en Supabase el archivo <strong>SQL-EQUIPO-FASE1.sql</strong> y vuelve a cargar.</p></section>

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Equipo BRÄVE</h2>
          <p className="text-[14px] text-tinta-2">Quién entra en el panel del equipo (bravestudio.app/team) y qué ve según su rol. Cada persona con su propia cuenta.</p>
        </div>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-[13px] font-semibold text-tinta-2">Nombre</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nahir" className="input-field" required /></label>
          <label className="space-y-1"><span className="text-[13px] font-semibold text-tinta-2">Email</span>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nahir@email.com" className="input-field" required /></label>
          <label className="space-y-1"><span className="text-[13px] font-semibold text-tinta-2">Rol</span>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
              {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          <label className="space-y-1"><span className="text-[13px] font-semibold text-tinta-2">Su ficha en el panel (sus clientas y tareas)</span>
            <select value={form.member_id} onChange={e => {
              const t = TEAM.find(x => x.id === e.target.value)
              setForm(f => ({ ...f, member_id: e.target.value, name: f.name || t?.name || '', role: t?.role ?? f.role }))
            }} className="input-field">
              <option value="">Nueva ficha</option>
              {fichas.map(t => <option key={t.id} value={t.id}>{t.name} · {ROLE_LABEL[t.role] ?? t.role}</option>)}
            </select></label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Dar acceso</button>
          </div>
        </form>
        {msg && (
          <div className={`rounded-2xl p-3.5 text-[14px] ${msg.tone === 'ok' ? 'bg-[#EAF3EC] text-[#1F5C38]' : 'bg-mantequilla/60 text-burdeos'}`} role="status">
            <p>{msg.text}</p>
            {msg.password && (
              <p className="mt-2 flex items-center gap-2 font-mono text-[15px] text-ink">
                {msg.password}
                <button onClick={() => navigator.clipboard.writeText(msg.password!)} className="text-cereza" aria-label="Copiar contraseña"><Copy size={15} /></button>
              </p>
            )}
            {msg.password && <p className="mt-1 text-[12px]">Entra en bravestudio.app/team/login. Puede cambiarla en «¿Olvidaste tu contraseña?».</p>}
          </div>
        )}
      </section>

      <section className="space-y-2">
        {list === null ? <div className="h-20 rounded-2xl bg-white/60 animate-pulse" />
          : !list.length ? <p className="card p-5 text-[15px] text-tinta-2">Aún no hay nadie. Empieza por ti (rol Dirección) y luego añade al equipo.</p>
          : list.map(m => (
            <div key={m.profile_id} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <p className="text-[15px] font-semibold text-ink">{m.name} <span className="ml-1 text-[12px] font-semibold text-cereza">{ROLE_LABEL[m.role] ?? m.role}</span></p>
                <p className="text-[13px] text-tinta-2">{m.email ?? '—'} · ficha {m.member_id}</p>
              </div>
              <button onClick={async () => { try { const j = await post({ accion: 'nueva-clave', profile_id: m.profile_id }); setMsg({ tone: 'ok', text: `Nueva contraseña temporal para ${m.name}:`, password: j.password ?? undefined }) } catch (e) { setMsg({ tone: 'error', text: (e as Error).message }) } }}
                className="btn-ghost text-sm"><KeyRound size={14} /> Nueva contraseña</button>
              <button onClick={async () => { if (!confirm(`¿Quitar a ${m.name} del equipo? Su cuenta no se borra.`)) return; await post({ accion: 'quitar', profile_id: m.profile_id }).catch(() => null); load() }}
                className="btn-ghost text-sm text-cereza"><UserMinus size={14} /> Quitar</button>
            </div>
          ))}
      </section>
    </div>
  )
}
