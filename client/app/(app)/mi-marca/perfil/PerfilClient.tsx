'use client'
/**
 * OPTIMIZA TU PERFIL · fase 1 (23-oct-2026).
 * Sube una captura de tu perfil → te digo qué cambiar: nombre (para que te
 * encuentren), 3 bios, links en orden, foto de perfil y destacadas.
 * Se guarda en la cuenta (brand_profiles.roadmap_json.perfil).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Circle, Copy, ExternalLink, ImagePlus, Link2, Pencil, Sparkles, Type, UserRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { demoGetBrand, demoSaveBrand } from '@/lib/demo-store'
import type { BrandProfile } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/ui/PageHeader'
import CoverGallery from '@/components/perfil/CoverGallery'
import { asList, asText, type Answers } from '@/lib/marca/questions'
import { BIO_MAX, informe, type PerfilActual, type PerfilDatos, type PerfilInforme } from '@/lib/perfil/optimiza'

type Guardado = { datos: PerfilDatos; actual: PerfilActual | null; informe: PerfilInforme; googleOk?: boolean }

const APPS = ['Booksy', 'Treatwell', 'Fresha', 'Bewe', 'Otra']

/** Reduce la captura (lado largo 1600 px, JPEG) para enviarla rápido. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const k = Math.min(1, 1600 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.85)
  } finally { URL.revokeObjectURL(url) }
}

function useCopy() {
  const toast = useToast()
  const [last, setLast] = useState<string | null>(null)
  return {
    last,
    copy: async (text: string, what = 'Copiado') => {
      try { await navigator.clipboard.writeText(text); setLast(text); toast.show(`${what} ✓`, 'success'); setTimeout(() => setLast(l => (l === text ? null : l)), 2000) }
      catch { toast.show('No se ha podido copiar. Mantén pulsado el texto para copiarlo.', 'info') }
    },
  }
}

function CopyBtn({ text, label = 'Copiar', what, copier, dark }: { text: string; label?: string; what?: string; copier: ReturnType<typeof useCopy>; dark?: boolean }) {
  const done = copier.last === text
  return (
    <button onClick={() => copier.copy(text, what)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold flex-shrink-0 ${dark ? 'bg-mantequilla text-burdeos' : 'bg-warm-gray text-cherry-dark hover:bg-rosa/60'}`}>
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{done ? 'Copiado' : label}
    </button>
  )
}

function Section({ n, icon, title, where, children }: { n: number; icon: React.ReactNode; title: string; where?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 space-y-4" aria-labelledby={`perfil-${n}`}>
      <header className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-rosa/60 text-burdeos flex items-center justify-center flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <h2 id={`perfil-${n}`} className="text-[19px] font-semibold text-ink leading-tight"><span className="text-cereza tabular-nums">{n}.</span> {title}</h2>
          {where && <p className="text-[13px] text-tinta-2 mt-0.5">{where}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

export default function PerfilClient({ userId, brand }: { userId: string; brand: BrandProfile | null }) {
  const isDemo = userId === 'demo'
  const toast = useToast()
  const copier = useCopy()
  const [mounted, setMounted] = useState(false)
  const [row, setRow] = useState<Record<string, unknown> | null>(brand as unknown as Record<string, unknown> | null)
  useEffect(() => {
    if (isDemo) setRow((demoGetBrand() as Record<string, unknown> | null) ?? null)
    setMounted(true)
  }, [isDemo])

  const saved = (row?.roadmap_json as { perfil?: Guardado } | null)?.perfil
  const respuestas = (row?.strategy_json as { respuestas?: Answers } | null)?.respuestas ?? {}
  const hasMarca = !!(row?.strategy_json as object | null)

  const base: PerfilDatos = useMemo(() => ({
    salon: asText(respuestas.salon) || (row?.salon_name as string) || '',
    ciudad: asText(respuestas.ciudad) || (row?.city as string) || '',
    servicios: asList(respuestas.servicios).length ? asList(respuestas.servicios) : ((row?.main_services as string[] | null) ?? []),
    estrella: asText(respuestas.estrella) || (row?.service_to_promote as string) || '',
    equipo: asText(respuestas.equipo),
    tono: asText(respuestas.tono),
    problema: asList(respuestas.problema),
    diferencia: asText(respuestas.diferencia),
    whatsapp: '', google: '', reservaApp: '', reservaUrl: '', web: '',
  }), [row]) // eslint-disable-line react-hooks/exhaustive-deps

  const [datos, setDatos] = useState<PerfilDatos>(base)
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Al cargar: los datos guardados (WhatsApp, links…) encima de los de Mi Marca.
  useEffect(() => {
    if (!mounted) return
    setDatos({ ...base, ...(saved?.datos ? { whatsapp: saved.datos.whatsapp, google: saved.datos.google, reservaApp: saved.datos.reservaApp, reservaUrl: saved.datos.reservaUrl, web: saved.datos.web } : {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, base])

  const set = <K extends keyof PerfilDatos>(k: K, v: PerfilDatos[K]) => setDatos(d => ({ ...d, [k]: v }))

  async function pick(f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.show('Sube una imagen (captura de pantalla).', 'info'); return }
    try { setImage(await shrink(f)) } catch { toast.show('No he podido abrir esa imagen. Prueba con otra captura.', 'info') }
  }

  async function persist(g: Guardado) {
    const prev = (row?.roadmap_json as Record<string, unknown> | null) ?? {}
    const roadmap_json = { ...prev, perfil: g }
    if (isDemo) {
      const r = { ...(row ?? {}), roadmap_json, user_id: userId }
      demoSaveBrand(r); setRow(r); return true
    }
    const supabase = createClient()
    const res = row?.id
      ? await supabase.from('brand_profiles').update({ roadmap_json, updated_at: new Date().toISOString() }).eq('id', row.id as string).select('*').single()
      : await supabase.from('brand_profiles').insert({ roadmap_json, user_id: userId } as never).select('*').single()
    if (res.error) return false
    setRow(res.data as Record<string, unknown>)
    return true
  }

  async function analizar() {
    if (!datos.salon.trim()) { toast.show('Escribe el nombre de tu salón.', 'info'); return }
    setBusy(true); setAviso(null)
    let actual: PerfilActual | null = null
    let ia: { nombres?: string[]; bios?: PerfilInforme['bios'] } | undefined
    let lectura: string | null = null
    try {
      const res = await fetch('/api/perfil/analizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, datos }) })
      if (res.ok) {
        const j = await res.json()
        actual = j.actual ?? null
        ia = { nombres: j.nombres, bios: j.bios }
        lectura = j.lectura
      } else lectura = 'sin-ia'
    } catch { lectura = 'sin-ia' }
    if (image && lectura === 'fallo') setAviso('No he podido leer bien tu captura. Te dejo las propuestas igualmente; si quieres la revisión, prueba con otra captura donde se vea entero el perfil.')
    else if (lectura === 'sin-ia') setAviso(image ? 'La IA no está disponible ahora mismo: no he podido leer tu captura. Las propuestas están hechas con tus respuestas de Mi Marca.' : 'La IA no está disponible ahora mismo: las propuestas están hechas con tus respuestas de Mi Marca.')
    const inf = informe(datos, actual, ia)
    const ok = await persist({ datos, actual, informe: inf })
    setBusy(false)
    if (!ok) { toast.show('No se ha podido guardar. Revisa la conexión e inténtalo de nuevo.', 'info'); return }
    setEditing(false); setImage(null)
    toast.show('¡Tu perfil optimizado está listo!', 'success')
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!mounted) return <div className="h-64 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" aria-busy="true" />

  const showForm = editing || !saved
  const inf = saved?.informe

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/mi-marca" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-cereza hover:underline"><ArrowLeft size={15} aria-hidden /> Mi Marca</Link>
      <PageHeader
        title="Optimiza tu perfil"
        subtitle="Que quien entre en tu Instagram sepa en 3 segundos qué haces, dónde estás y cómo reservar."
        actions={!showForm ? <button onClick={() => setEditing(true)} className="btn-ghost"><Pencil size={15} aria-hidden /> Volver a analizar</button> : undefined}
      />

      {showForm ? (
        <section className="card p-5 sm:p-6 space-y-5" aria-label="Tus datos">
          {!hasMarca && (
            <p className="rounded-2xl bg-mantequilla/60 text-burdeos p-3.5 text-[14px]">
              Consejo: completa antes <Link href="/mi-marca" className="font-semibold underline">Mi Marca</Link> (5 minutos) y las propuestas saldrán con tus servicios y tu estilo.
            </p>
          )}

          {/* Captura */}
          <div className="space-y-2">
            <p className="text-[15px] font-semibold text-ink">1. Captura de tu perfil <span className="font-normal text-tinta-2">(recomendado)</span></p>
            <p className="text-[14px] text-tinta-2">Haz una captura de pantalla de tu perfil donde se vean el nombre, la bio, los links y las destacadas.</p>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
            {image ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Tu captura" className="w-20 h-32 object-cover object-top rounded-xl border border-borde" />
                <div className="flex flex-col gap-2">
                  <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">Cambiar</button>
                  <button onClick={() => setImage(null)} className="inline-flex items-center gap-1 text-[14px] text-tinta-2 hover:text-cereza"><X size={14} aria-hidden /> Quitar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
                className="w-full rounded-2xl border-2 border-dashed border-borde hover:border-cereza bg-warm-gray/40 py-7 flex flex-col items-center gap-2 text-tinta-2">
                <ImagePlus size={26} className="text-cereza" aria-hidden />
                <span className="text-[15px] font-semibold text-ink">Subir captura</span>
                <span className="text-[13px]">o arrástrala aquí</span>
              </button>
            )}
          </div>

          {/* Datos */}
          <div className="space-y-3">
            <p className="text-[15px] font-semibold text-ink">2. Tus datos</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Nombre del salón</span>
                <input value={datos.salon} onChange={e => set('salon', e.target.value)} placeholder="Aura Hair Studio" className="input-field text-[16px]" /></label>
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Ciudad</span>
                <input value={datos.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Logroño" className="input-field text-[16px]" /></label>
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Tu WhatsApp para reservas</span>
                <input value={datos.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="600 123 456" inputMode="tel" className="input-field text-[16px]" /></label>
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Link de tu ficha de Google <span className="font-normal text-tinta-2">(opcional)</span></span>
                <input value={datos.google} onChange={e => set('google', e.target.value)} placeholder="share.google/…" className="input-field text-[16px]" />
                <span className="block text-[12px] text-tinta-2">En Google Maps, busca tu salón → Compartir → Copiar enlace.</span></label>
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">¿Usas app de reservas?</span>
                <select value={datos.reservaApp} onChange={e => set('reservaApp', e.target.value)} className="input-field text-[16px]">
                  <option value="">No, reservan por WhatsApp</option>
                  {APPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select></label>
              {datos.reservaApp && (
                <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Link de reservas</span>
                  <input value={datos.reservaUrl} onChange={e => set('reservaUrl', e.target.value)} placeholder="booksy.com/…" className="input-field text-[16px]" /></label>
              )}
              <label className="block space-y-1.5"><span className="text-[14px] font-semibold text-ink">Tu web <span className="font-normal text-tinta-2">(opcional)</span></span>
                <input value={datos.web} onChange={e => set('web', e.target.value)} placeholder="tusalon.com" className="input-field text-[16px]" /></label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={analizar} disabled={busy} className="btn-primary justify-center text-base py-3.5 sm:flex-1">
              <Sparkles size={18} aria-hidden /> {busy ? (image ? 'Leyendo tu perfil…' : 'Preparando tus propuestas…') : 'Optimizar mi perfil'}
            </button>
            {saved && <button onClick={() => setEditing(false)} disabled={busy} className="btn-ghost justify-center">Cancelar</button>}
          </div>
        </section>
      ) : inf && (
        <Informe userId={userId} inf={inf} actual={saved!.actual} aviso={aviso} copier={copier} salon={saved!.datos.salon} onEdit={() => setEditing(true)}
          googleOk={!!saved!.googleOk}
          onGoogleOk={async () => { if (await persist({ ...saved!, googleOk: true })) toast.show('¡Perfecto! Ya puedes copiar el link.', 'success'); else toast.show('No se ha podido guardar. Inténtalo de nuevo.', 'info') }} />
      )}
    </div>
  )
}

function Informe({ userId, inf, actual, aviso, copier, salon, onEdit, googleOk, onGoogleOk }: { userId: string; inf: PerfilInforme; actual: PerfilActual | null; aviso: string | null; copier: ReturnType<typeof useCopy>; salon: string; onEdit: () => void; googleOk: boolean; onGoogleOk: () => void }) {
  const pending = inf.checks?.filter(c => !c.ok) ?? []
  return (
    <div className="space-y-4">
      {aviso && <p className="rounded-2xl bg-mantequilla/60 text-burdeos p-3.5 text-[14px]" role="status">{aviso}</p>}

      {/* Revisión */}
      {inf.checks && inf.puntuacion !== null ? (
        <section className="rounded-[var(--radius-lg)] bg-burdeos text-crema p-5 sm:p-6 space-y-4" data-tone="dark" aria-label="Revisión de tu perfil">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0" role="img" aria-label={`Tu perfil: ${inf.puntuacion} de 100`}>
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F6E7A6" strokeWidth="3.5" strokeLinecap="round" pathLength={100} strokeDasharray={`${inf.puntuacion} 100`} /></svg>
              <span className="absolute inset-0 flex items-center justify-center text-[22px] font-semibold tabular-nums">{inf.puntuacion}</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-mantequilla">{actual?.usuario ? `@${actual.usuario.replace(/^@/, '')}` : 'Tu perfil ahora'}</p>
              <h2 className="!text-crema text-[21px] font-semibold leading-tight">{pending.length ? `${pending.length} ${pending.length === 1 ? 'cosa' : 'cosas'} por mejorar` : '¡Tu perfil está muy bien!'}</h2>
              <p className="text-[14px] text-crema/80">Abajo tienes todo listo para copiar y pegar.</p>
            </div>
          </div>
          <ul className="grid gap-2">
            {[...pending, ...inf.checks.filter(c => c.ok)].map(c => (
              <li key={c.label} className={`flex gap-2.5 rounded-2xl p-3 ${c.ok ? 'bg-white/5' : 'bg-white/12'}`}>
                {c.ok ? <CheckCircle2 size={19} className="text-[#9BD3AE] flex-shrink-0 mt-0.5" aria-hidden /> : <Circle size={19} className="text-mantequilla flex-shrink-0 mt-0.5" aria-hidden />}
                <span><span className="block text-[15px] font-semibold">{c.label}</span>{!c.ok && <span className="block text-[14px] text-crema/80">{c.consejo}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl bg-warm-gray p-3.5 text-[14px] text-tinta-2 flex gap-2"><Camera size={17} className="flex-shrink-0 mt-0.5" aria-hidden />Sube una captura de tu perfil (en «Volver a analizar») y además te digo qué tienes bien y qué cambiar.</p>
      )}

      {/* 1. Nombre */}
      <Section n={1} icon={<Type size={19} aria-hidden />} title="Tu nombre: que te encuentren" where="Editar perfil → Nombre. Es lo que lee el buscador de Instagram.">
        {actual?.nombre && <p className="text-[14px] text-tinta-2">Ahora: <span className="text-ink font-medium">{actual.nombre}</span></p>}
        <ul className="space-y-2">
          {inf.nombres.map(n => (
            <li key={n} className="flex items-center justify-between gap-3 rounded-2xl border border-borde bg-white px-4 py-3">
              <span className="text-[16px] font-semibold text-ink min-w-0 break-words">{n}</span>
              <CopyBtn text={n} what="Nombre copiado" copier={copier} />
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-tinta-2">Instagram solo deja cambiar el nombre 2 veces cada 14 días: elige con calma. Categoría recomendada: <strong className="text-ink">{inf.categoria}</strong>.</p>
      </Section>

      {/* 2. Bio */}
      <Section n={2} icon={<Sparkles size={19} aria-hidden />} title="Tu bio: elige la que más te guste" where={`Editar perfil → Presentación. Máximo ${BIO_MAX} caracteres.`}>
        {actual?.bio && <p className="text-[14px] text-tinta-2 whitespace-pre-line">Ahora: <span className="text-ink">{actual.bio}</span></p>}
        <div className="grid gap-3 md:grid-cols-3">
          {inf.bios.map(b => (
            <article key={b.estilo} className="rounded-2xl border border-borde bg-white p-4 flex flex-col gap-3">
              <p className="text-[13px] font-semibold text-cereza">{b.estilo}</p>
              <p className="text-[15px] text-ink whitespace-pre-line leading-snug flex-1">{b.texto}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-tinta-2 tabular-nums">{b.texto.length}/{BIO_MAX}</span>
                <CopyBtn text={b.texto} what="Bio copiada" copier={copier} />
              </div>
            </article>
          ))}
        </div>
        <p className="text-[13px] text-tinta-2">Deja solo tu ciudad: la dirección completa va en el link «Cómo llegar».{inf.ia ? '' : ' (Hechas con tus respuestas de Mi Marca.)'}</p>
      </Section>

      {/* 3. Links */}
      <Section n={3} icon={<Link2 size={19} aria-hidden />} title="Tus links, en este orden" where="Editar perfil → Enlaces → Añadir enlace externo. Pon el título y la URL.">
        <ol className="space-y-2">
          {inf.links.map(l => (
            <li key={l.orden} className="rounded-2xl border border-borde bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-ink">{l.orden}. {l.titulo}</p>
                  <p className="text-[14px] text-tinta-2">{l.para}</p>
                </div>
                <CopyBtn text={l.titulo} label="Título" what="Título copiado" copier={copier} />
              </div>
              {l.url && l.comprobar && !googleOk ? (
                <div className="rounded-xl bg-mantequilla/60 p-3.5 space-y-3 text-burdeos">
                  <p className="flex gap-2 text-[14px]"><AlertTriangle size={17} className="flex-shrink-0 mt-0.5" aria-hidden />
                    <span>Este link busca <strong>«{l.comprobar}»</strong> en Google Maps. Si en Google tu salón tiene otro nombre, puede salir otro sitio. <strong>Ábrelo y comprueba que sale tu salón.</strong></span></p>
                  <div className="flex flex-wrap gap-2">
                    <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold"><ExternalLink size={14} aria-hidden /> Probar link</a>
                    <button onClick={onGoogleOk} className="inline-flex items-center gap-1.5 rounded-full bg-burdeos text-crema px-3.5 py-2 text-[13px] font-semibold"><Check size={14} aria-hidden /> Sí, es mi salón</button>
                    <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold underline">No sale bien: pegar mi ficha</button>
                  </div>
                </div>
              ) : l.url ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-warm-gray/60 px-3 py-2">
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-[13px] text-cherry-dark truncate hover:underline">{l.url}</a>
                  <CopyBtn text={l.url} label="Link" what="Link copiado" copier={copier} />
                </div>
              ) : (
                <button onClick={onEdit} className="text-[14px] font-semibold text-cereza hover:underline">{l.falta} →</button>
              )}
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-tinta-2">Instagram deja hasta 5 links y el primero es el que se ve: que sea siempre el de reservar. Prueba cada link desde tu móvil antes de dejarlo.</p>
      </Section>

      {/* 4. Foto */}
      <Section n={4} icon={<UserRound size={19} aria-hidden />} title={`Foto de perfil: ${inf.foto.titulo.toLowerCase()}`}>
        <FotoEjemplos tipo={inf.foto.tipo} salon={salon} />
        {inf.foto.actual && <p className="text-[14px] font-semibold text-ink">{inf.foto.actual}</p>}
        <p className="text-[15px] text-ink">{inf.foto.consejo}</p>
        {inf.foto.tipo === 'retrato' && (
          <Link href="/estudio" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-cereza hover:underline">Mejórala en el Estudio de fotos <ArrowRight size={15} aria-hidden /></Link>
        )}
      </Section>

      {/* 5. Destacadas */}
      <Section n={5} icon={<Circle size={19} aria-hidden />} title="Tus historias destacadas" where="Nombres cortos para que no se corten. De 1 a 4 stories en cada una.">
        {actual?.destacadas?.length ? <p className="text-[14px] text-tinta-2">Ahora: {actual.destacadas.join(' · ')}</p> : null}
        <ul className="space-y-2">
          {inf.destacadas.map(d => (
            <li key={d.nombre} className="rounded-2xl border border-borde bg-white px-4 py-3">
              <p className="text-[15px] font-semibold text-ink">{d.nombre}{d.tipo === 'especialidad' && <span className="ml-2 text-[12px] font-semibold text-cereza">Tu especialidad</span>}</p>
              <p className="text-[14px] text-tinta-2">{d.que_poner}</p>
            </li>
          ))}
        </ul>
        <Link href="/stories" className="btn-ghost justify-center w-full sm:w-auto">Crear las stories de cada destacada <ArrowRight size={16} aria-hidden /></Link>
        <div className="border-t border-borde pt-5">
          <CoverGallery userId={userId} nombres={inf.destacadas.map(d => d.nombre)} />
        </div>
      </Section>
    </div>
  )
}

/** Ejemplos de foto de perfil, tal como se verían en el círculo de Instagram. */
function FotoEjemplos({ tipo, salon }: { tipo: 'logo' | 'retrato'; salon: string }) {
  const name = (salon.trim().split(/\s+/)[0] || 'Salón').toUpperCase().slice(0, 10)
  const fs = name.length <= 5 ? 30 : name.length <= 7 ? 24 : 19
  const items = [
    {
      id: 'logo', label: 'Logo', nota: 'Si sois equipo',
      el: (
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
          <circle cx="50" cy="50" r="50" fill="#9C8B7A" />
          <text x="50" y="33" textAnchor="middle" fontSize="7" letterSpacing="1.5" fill="#F4EDE4" fontWeight="600">HAIR SALON</text>
          <text x="50" y={50 + fs / 3} textAnchor="middle" fontSize={fs} fontWeight="700" fill="#FFF7EE">{name}</text>
          <line x1="34" y1="68" x2="66" y2="68" stroke="#F4EDE4" strokeWidth="0.8" />
        </svg>
      ),
    },
    {
      id: 'retrato', label: 'Retrato', nota: 'Si trabajas sola',
      // eslint-disable-next-line @next/next/no-img-element
      el: <img src="/perfil/ejemplo-retrato.jpg" alt="" className="w-full h-full object-cover" />,
    },
    {
      id: 'evita', label: 'Evita', nota: 'El local de lejos',
      // eslint-disable-next-line @next/next/no-img-element
      el: <img src="/banco-ia/salon/sillon-vacio.jpg" alt="" className="w-full h-full object-cover" />,
    },
  ] as const
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md" role="list" aria-label="Ejemplos de foto de perfil">
      {items.map(it => {
        const rec = it.id === tipo
        const bad = it.id === 'evita'
        return (
          <div key={it.id} role="listitem" className={`flex flex-col items-center gap-2 rounded-2xl p-2.5 pb-3 ${rec ? 'bg-rosa/50' : ''}`}>
            <span className={`w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-full p-[3px] ${rec ? 'bg-gradient-to-tr from-[#F6C26B] via-[#E1306C] to-[#833AB4]' : 'bg-borde'} ${bad ? 'opacity-60 grayscale' : ''}`}>
              <span className="block w-full h-full rounded-full overflow-hidden border-2 border-white bg-white">{it.el}</span>
            </span>
            <span className="text-center leading-tight">
              <span className={`block text-[14px] font-semibold ${bad ? 'text-tinta-2' : 'text-ink'}`}>{bad ? '✕ ' : rec ? '✓ ' : ''}{it.label}</span>
              <span className="block text-[12px] text-tinta-2">{rec ? 'Te lo recomiendo' : it.nota}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
