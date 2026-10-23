'use client'
/**
 * MI MARCA (23-oct-2026): «Tu marca en 5 minutos».
 * 1) Preguntas, una por pantalla (casi todo con un toque).
 * 2) Tu estrategia en 5 tarjetas (IA, o versión sin IA si no responde).
 * 3) Tu camino BRÄVE: hoja de ruta visual de 5 etapas.
 * Guarda también el documento completo que usan Bravi y los generadores.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, AtSign, Clock, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import InstagramHomeCard from '@/components/home/InstagramHomeCard'
import type { InstagramCardProps } from '@/lib/social/card-state'
import { createClient } from '@/lib/supabase/client'
import { demoGetBrand, demoSaveBrand } from '@/lib/demo-store'
import type { BrandProfile } from '@/types/database'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { normalizeStrategy, type StrategyDocument } from '@/lib/strategy-types'
import { useSessionState } from '@/lib/session-store'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/ui/PageHeader'
import Bravi from '@/components/bravi/Bravi'
import Questionnaire from '@/components/marca/Questionnaire'
import StrategyCards from '@/components/marca/StrategyCards'
import CaminoPath from '@/components/marca/CaminoPath'
import { QUESTIONS, answersToText, asList, asText, type Answers } from '@/lib/marca/questions'
import { buildBrave5Prompt, mockBrave5, isBrave5, brave5ToStrategy, strategyToBrave5, type Brave5 } from '@/lib/marca/brave5'

type Mode = 'intro' | 'preguntas' | 'resultado'

export default function MiMarcaClient({ userId, brand, instagram }: { userId: string; brand: BrandProfile | null; instagram?: InstagramCardProps }) {
  const isDemoMode = userId === 'demo'
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [brandRow, setBrandRow] = useState<Record<string, unknown> | null>(brand as unknown as Record<string, unknown> | null)

  // En demo, la marca vive en el navegador.
  useEffect(() => {
    if (isDemoMode) setBrandRow((demoGetBrand() as Record<string, unknown> | null) ?? null)
    setMounted(true)
  }, [isDemoMode])

  const stored = brandRow?.strategy_json as (StrategyDocument & { brave5?: Brave5; respuestas?: Answers }) | undefined
  const strategy = useMemo(() => (stored && (stored.brave5 || stored.perfil_brave) ? normalizeStrategy(stored) as StrategyDocument & { brave5?: Brave5 } : null), [stored])
  const b5 = useMemo(() => (strategy ? strategyToBrave5({ ...strategy, brave5: stored?.brave5 }) : null), [strategy, stored])

  const [answers, setAnswers] = useSessionState<Answers>(`u:${userId}:marca:answers`, {})
  const [step, setStep] = useSessionState<number>(`u:${userId}:marca:step`, 0)
  const [mode, setMode] = useState<Mode>('intro')
  const [busy, setBusy] = useState(false)
  const manual = ((brandRow?.roadmap_json as { camino?: Record<string, boolean> } | null)?.camino) ?? {}

  // Al cargar: con estrategia → resultado; si ya había empezado → preguntas.
  useEffect(() => {
    if (!mounted) return
    if (strategy) setMode('resultado')
    else if (Object.keys(answers).length) setMode('preguntas')
    // Las respuestas guardadas en la cuenta rellenan el cuestionario para editarlo.
    if (!Object.keys(answers).length && stored?.respuestas) setAnswers(stored.respuestas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  async function save(patch: Record<string, unknown>) {
    const row = { ...(brandRow ?? {}), ...patch, user_id: userId, updated_at: new Date().toISOString() }
    if (isDemoMode) {
      demoSaveBrand(row)
      setBrandRow(row)
      return true
    }
    const supabase = createClient()
    const res = brandRow?.id
      ? await supabase.from('brand_profiles').update({ ...patch, updated_at: row.updated_at }).eq('id', brandRow.id as string).select('*').single()
      : await supabase.from('brand_profiles').insert({ ...patch, user_id: userId } as never).select('*').single()
    if (res.error) return false
    setBrandRow(res.data as Record<string, unknown>)
    return true
  }

  async function createStrategy() {
    setBusy(true)
    let b: Brave5 | null = null
    try {
      const raw = await generateAIContent(buildBrave5Prompt(answers))
      const parsed = extractJSON<Brave5>(raw)
      if (isBrave5(parsed)) b = parsed
    } catch { /* sin IA: versión hecha con sus respuestas */ }
    if (!b) b = mockBrave5(answers)
    const doc = brave5ToStrategy(b, answers)
    const ok = await save({
      raw_input: answersToText(answers),
      salon_name: asText(answers.salon) || null,
      city: asText(answers.ciudad) || null,
      main_services: asList(answers.servicios),
      service_to_promote: asText(answers.estrella) || null,
      content_topics: b.pilares.map(p => p.nombre),
      optimized_summary: doc.resumen_para_ia,
      strategy_json: doc,
      completion_status: 'complete',
    })
    setBusy(false)
    if (!ok) {
      toast.show('No se ha podido guardar tu estrategia. Revisa la conexión e inténtalo de nuevo.', 'info')
      return
    }
    setMode('resultado')
    toast.show('¡Tu estrategia está lista!', 'success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function setManual(id: string, done: boolean) {
    const prev = (brandRow?.roadmap_json as Record<string, unknown> | null) ?? {}
    const camino = { ...manual, [id]: done }
    const ok = await save({ roadmap_json: { ...prev, camino } })
    if (!ok) toast.show('No se ha podido guardar. Inténtalo de nuevo.', 'info')
    else if (done) toast.show('¡Paso hecho! 💪', 'success')
  }

  if (!mounted) return <div className="h-64 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" aria-busy="true" />

  // ── 1. Bienvenida ──
  if (mode === 'intro') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-burdeos text-crema p-6 sm:p-8 space-y-5" data-tone="dark">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-40 blur-3xl" style={{ background: '#B8324F' }} />
          <Bravi size={64} showMessage={false} />
          <div className="relative space-y-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-mantequilla">Mi Marca</p>
            <h1 className="!text-crema text-[30px] sm:text-[38px] leading-tight font-semibold">Tu marca en 5 minutos</h1>
            <p className="text-[16px] text-crema/85 max-w-md">Contesta {QUESTIONS.length} preguntas cortas (casi todas con un toque) y te preparo tu estrategia y tu camino paso a paso.</p>
          </div>
          <ul className="relative grid gap-2 text-[15px]">
            {['Tu marca en una frase y tu bio de Instagram', 'Tu clienta ideal y tu servicio estrella', 'Qué publicar y cuánto, según tu tiempo'].map(t => (
              <li key={t} className="flex gap-2"><Sparkles size={17} className="text-mantequilla flex-shrink-0 mt-0.5" aria-hidden />{t}</li>
            ))}
          </ul>
          <button onClick={() => setMode('preguntas')} className="relative btn-primary w-full sm:w-auto justify-center !bg-mantequilla !text-burdeos text-base py-3.5 px-7">
            {Object.keys(answers).length ? 'Seguir donde lo dejé' : 'Empezar'}
          </button>
          <p className="relative text-[13px] text-crema/70 flex items-center gap-1.5"><Clock size={14} aria-hidden /> Se guarda solo: puedes parar y seguir luego.</p>
        </section>
        {instagram && <InstagramHomeCard {...instagram} />}
      </div>
    )
  }

  // ── 2. Preguntas ──
  if (mode === 'preguntas') {
    return (
      <div className="space-y-4">
        <Questionnaire answers={answers} onChange={setAnswers} step={step} onStep={setStep} onFinish={createStrategy} busy={busy} />
        {strategy && <p className="text-center"><button onClick={() => setMode('resultado')} className="text-[14px] font-semibold text-cereza hover:underline">Volver a mi estrategia sin cambios</button></p>}
      </div>
    )
  }

  // ── 3. Resultado: camino + estrategia ──
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Mi Marca"
        subtitle="Tu camino paso a paso y tu estrategia en 5 tarjetas."
        actions={
          <>
            <button onClick={() => { setStep(0); setMode('preguntas') }} className="btn-ghost"><Pencil size={15} aria-hidden /> Editar respuestas</button>
            <button onClick={createStrategy} disabled={busy} className="btn-ghost"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} aria-hidden /> Rehacer</button>
          </>
        }
      />
      <Link href="/mi-marca/perfil" className="group flex items-center gap-4 rounded-[var(--radius-lg)] bg-rosa/60 p-4 sm:p-5 hover:bg-rosa transition-colors">
        <span className="w-12 h-12 rounded-2xl bg-burdeos text-crema flex items-center justify-center flex-shrink-0"><AtSign size={22} aria-hidden /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-semibold text-burdeos">Optimiza tu perfil de Instagram</span>
          <span className="block text-[14px] text-burdeos/80">Sube una captura: nombre, bio, links y destacadas listos para copiar.</span>
        </span>
        <ArrowRight size={20} className="text-burdeos flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden />
      </Link>
      <CaminoPath userId={userId} hasStrategy={!!strategy} instagram={instagram?.state === 'connected'} manual={manual} onManual={setManual} />
      {b5 && (
        <section className="space-y-3" aria-label="Tu estrategia">
          <h2 className="text-lg font-semibold text-ink">Tu estrategia</h2>
          <StrategyCards b={b5} />
        </section>
      )}
      {instagram && <InstagramHomeCard {...instagram} />}
    </div>
  )
}
