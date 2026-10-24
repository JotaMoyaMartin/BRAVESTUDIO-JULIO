'use client'
/**
 * MI EQUIPO BRÄVE (clientas del servicio, 24-oct-2026).
 * Envía material (fotos y vídeos del salón) y pide ideas al equipo que lleva
 * sus redes. Ve el estado de cada envío.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, ImagePlus, Lightbulb, Loader2, Paperclip, Send, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { EquipoError, listPeticiones, sendIdea, sendMaterial } from '@/lib/equipo/client'
import { ESTADO_PET, MAX_FILES, MAX_FILE_MB, type Peticion } from '@/lib/equipo/types'

const when = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

export default function MiEquipoClient() {
  const toast = useToast()
  const [mode, setMode] = useState<'material' | 'idea' | null>(null)
  const [list, setList] = useState<Peticion[] | null>(null)
  const [inactive, setInactive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [mensaje, setMensaje] = useState('')
  const [titulo, setTitulo] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { const r = await listPeticiones(); setList(r.peticiones); setInactive(!!r.missingTable) } catch { setList([]) }
  }, [])
  useEffect(() => { load() }, [load])

  function addFiles(fl: FileList | null) {
    if (!fl) return
    const next = [...files, ...Array.from(fl).filter(f => /^(image|video)\//.test(f.type))].slice(0, MAX_FILES)
    setFiles(next)
  }

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'material') {
        await sendMaterial(files, mensaje.trim(), (d, t) => setProgress([d, t]))
        toast.show('¡Enviado! Tu equipo ya tiene tu material.', 'success')
      } else {
        await sendIdea({ titulo: titulo.trim(), mensaje: mensaje.trim(), origen: { seccion: 'mi-equipo' } })
        toast.show('¡Idea enviada a tu equipo!', 'success')
      }
      setMode(null); setFiles([]); setMensaje(''); setTitulo('')
      load()
    } catch (e) {
      toast.show(e instanceof EquipoError ? e.message : 'No se ha podido enviar. Inténtalo de nuevo.', 'info')
    } finally { setBusy(false); setProgress(null) }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mi equipo BRÄVE" subtitle="Tu equipo lleva tus redes. Aquí le mandas fotos y vídeos del salón y le cuentas tus ideas." />

      {inactive && <p className="rounded-2xl bg-mantequilla/60 text-burdeos p-3.5 text-[14px]">Esta sección se está activando. Si no puedes enviar, avisa a tu equipo por WhatsApp.</p>}

      {!mode && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => setMode('material')} className="text-left rounded-[var(--radius-lg)] bg-burdeos text-crema p-5 space-y-2 hover:-translate-y-0.5 transition-transform" data-tone="dark">
            <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center"><ImagePlus size={22} aria-hidden /></span>
            <span className="block text-[19px] font-semibold !text-crema">Enviar material</span>
            <span className="block text-[14px] text-crema/80">Fotos y vídeos de tus trabajos, del salón o de ti. Con ellos preparamos tus publicaciones.</span>
          </button>
          <button onClick={() => setMode('idea')} className="text-left rounded-[var(--radius-lg)] bg-mantequilla text-burdeos p-5 space-y-2 hover:-translate-y-0.5 transition-transform">
            <span className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center"><Lightbulb size={22} aria-hidden /></span>
            <span className="block text-[19px] font-semibold">Pedir una idea</span>
            <span className="block text-[14px] opacity-80">¿Has visto algo que te gusta o tienes una promo? Cuéntaselo y lo preparamos.</span>
          </button>
        </div>
      )}

      {mode && (
        <section className="card p-5 sm:p-6 space-y-4" aria-label={mode === 'material' ? 'Enviar material' : 'Pedir una idea'}>
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-semibold text-ink">{mode === 'material' ? 'Enviar material' : 'Pedir una idea'}</h2>
            <button onClick={() => setMode(null)} disabled={busy} className="text-[14px] font-semibold text-cereza hover:underline">Cancelar</button>
          </div>

          {mode === 'material' ? (
            <>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={busy || files.length >= MAX_FILES}
                className="w-full rounded-2xl border-2 border-dashed border-borde hover:border-cereza bg-warm-gray/40 py-6 flex flex-col items-center gap-1.5">
                <Paperclip size={22} className="text-cereza" aria-hidden />
                <span className="text-[15px] font-semibold text-ink">{files.length ? 'Añadir más' : 'Elegir fotos y vídeos'}</span>
                <span className="text-[13px] text-tinta-2">Hasta {MAX_FILES} archivos de {MAX_FILE_MB} MB cada uno</span>
              </button>
              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-warm-gray/50 px-3 py-2 text-[14px]">
                      <span className="flex-1 min-w-0 truncate text-ink">{f.name}</span>
                      <span className={`tabular-nums text-[12px] ${f.size > MAX_FILE_MB * 1048576 ? 'text-cereza font-semibold' : 'text-tinta-2'}`}>{mb(f.size)}</span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={busy} aria-label={`Quitar ${f.name}`} className="text-tinta-2 hover:text-cereza"><X size={16} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="block space-y-1.5">
                <span className="text-[14px] font-semibold text-ink">¿Algo que debamos saber? <span className="font-normal text-tinta-2">(opcional)</span></span>
                <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3} placeholder="Balayage de Marta, el antes es la primera foto. Me encantaría un reel…" className="input-field resize-none text-[16px]" />
              </label>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-[14px] font-semibold text-ink">Tu idea en una frase</span>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={140} placeholder="Promo de tratamientos para noviembre" className="input-field text-[16px]" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[14px] font-semibold text-ink">Cuéntanos más <span className="font-normal text-tinta-2">(opcional)</span></span>
                <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={4} placeholder="Quiero llenar los martes por la mañana. Pega aquí un enlace si has visto algo que te gusta." className="input-field resize-none text-[16px]" />
              </label>
            </>
          )}

          <button onClick={submit} disabled={busy || (mode === 'material' ? !files.length : !titulo.trim() && !mensaje.trim())} className="btn-primary w-full sm:w-auto justify-center">
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
            {busy && progress ? `Subiendo ${progress[0]} de ${progress[1]}…` : busy ? 'Enviando…' : 'Enviar a mi equipo'}
          </button>
        </section>
      )}

      <section className="space-y-3" aria-label="Tus envíos">
        <h2 className="text-lg font-semibold text-ink">Tus envíos</h2>
        {list === null ? <div className="h-24 rounded-2xl bg-white/60 animate-pulse" aria-busy="true" />
          : !list.length ? <p className="rounded-2xl bg-warm-gray p-4 text-[15px] text-tinta-2">Aún no has enviado nada. Cuando mandes material o una idea, verás aquí cómo va.</p>
          : (
            <ul className="space-y-2">
              {list.map(p => (
                <li key={p.id} className="card p-4 flex gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.tipo === 'material' ? 'bg-rosa/60 text-burdeos' : 'bg-mantequilla text-burdeos'}`}>
                    {p.tipo === 'material' ? <ImagePlus size={18} aria-hidden /> : <Lightbulb size={18} aria-hidden />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-ink truncate">{p.titulo || (p.tipo === 'material' ? `${p.archivos.length} ${p.archivos.length === 1 ? 'archivo' : 'archivos'}` : 'Idea')}</p>
                    {p.mensaje && <p className="text-[14px] text-tinta-2 line-clamp-2">{p.mensaje}</p>}
                    {p.respuesta && <p className="mt-1.5 rounded-xl bg-[#EAF3EC] px-3 py-2 text-[14px] text-[#1F5C38]"><strong>Tu equipo:</strong> {p.respuesta}</p>}
                    <p className="mt-1 text-[12px] text-tinta-2 flex items-center gap-1.5">
                      {p.estado === 'hecha' ? <CheckCircle2 size={13} className="text-[#2A7A4A]" aria-hidden /> : <Clock size={13} aria-hidden />}
                      {ESTADO_PET[p.estado]} · {when(p.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}
