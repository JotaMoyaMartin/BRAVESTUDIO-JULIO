'use client'
/**
 * CARRUSELES PREMIUM — máquina de estados del flujo completo.
 *
 * style → studio → generating → result
 *
 * Aquí NO se diseña nada: los estilos son data (lib/carruseles/styles.ts) y la
 * experiencia vive en components/carruseles/. Este componente coordina:
 *   - propuesta de copy vía /api/ai/generate (prompt construido con lib/carruseles/prompts)
 *   - generación de imágenes slide a slide vía /api/carruseles/slide
 *   - regeneración de UNA slide sin tocar el resto
 *   - persistencia: draft en session-store; resultado final en content_items
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateAIContent, extractJSON } from '@/lib/ai/client'
import { saveToLibrary } from '@/lib/content-utils'
import { useSessionState } from '@/lib/session-store'
import { useToast } from '@/components/ui/Toast'
import {
  buildCopyPrompt, parseCopyProposal, buildHookPrompt, buildTweakPrompt,
  buildCtaRewritePrompt, ctaTextFor, stripCtaFromText, demoProposalFor,
} from '@/lib/carruseles/prompts'
import { getStyle } from '@/lib/carruseles/styles'
import type {
  CarouselDraft, CopyProposal, CopySlide, CtaMode, Signature, SlideResult, StyleConfig, VisualType,
} from '@/lib/carruseles/types'
import StylePicker from '@/components/carruseles/StylePicker'
import StyleSidePanel from '@/components/carruseles/StyleSidePanel'
import CopyStudio, { type CopyTweak } from '@/components/carruseles/CopyStudio'
import GeneratingView from '@/components/carruseles/GeneratingView'
import ResultGallery from '@/components/carruseles/ResultGallery'
import AddToPlanButton from '@/components/plan/AddToPlanButton'
import { defaultDesign, bankPhotoFor, type SlideDesign } from '@/lib/carruseles/composer'

interface Props {
  userId: string
  brandContext?: string
}

interface ResultsState {
  at: number
  draftId: string | null
  slides: SlideResult[]
}

const EMPTY_DRAFT: CarouselDraft = {
  styleId: null,
  view: 'style',
  topic: '',
  topicChips: [],
  slideCount: 'auto',
  proposal: null,
  ctaOverride: null,
  signature: { on: false, text: '' },
}

const EXPIRED_MS = 20 * 60 * 60 * 1000 // las URLs firmadas viven 24h

const DRAFT_KEY = (uid: string) => `u:${uid}:carruseles:premium:v1`
const RESULTS_KEY = (uid: string) => `u:${uid}:carruseles:premium:results:v1`

export default function CarruselesClient({ userId, brandContext }: Props) {
  const toast = useToast()
  const isDemoMode = userId === 'demo'
  // El borrador vive en el navegador: esperamos al montaje para no romper la hidratación.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [rawDraft, setDraft] = useSessionState<CarouselDraft>(DRAFT_KEY(userId), EMPTY_DRAFT)
  const [rawResults, setResultsState] = useSessionState<Partial<ResultsState>>(RESULTS_KEY(userId), {})
  const draft: CarouselDraft = useMemo(() => ({ ...EMPTY_DRAFT, ...rawDraft }), [rawDraft])
  const resultsState: ResultsState = useMemo(
    () => ({ at: rawResults?.at ?? 0, draftId: rawResults?.draftId ?? null, slides: rawResults?.slides ?? [] }),
    [rawResults],
  )

  // Busy states (transitorios, no persisten)
  const [proposalBusy, setProposalBusy] = useState(false)
  const [proposalError, setProposalError] = useState<string | null>(null)
  const [proposalIsDemo, setProposalIsDemo] = useState(false)
  // true = la propuesta falló porque la IA no respondió (no por falta de tema).
  const [proposalAIDown, setProposalAIDown] = useState(false)
  const [hookBusy, setHookBusy] = useState(false)
  const [tweakBusy, setTweakBusy] = useState<CopyTweak | null>(null)
  const [ctaBusy, setCtaBusy] = useState(false)
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const style: StyleConfig | null = draft.styleId ? getStyle(draft.styleId) ?? null : null
  const results: SlideResult[] = resultsState?.slides ?? []
  const imagesExpired = useMemo(
    () => !!resultsState?.at && Date.now() - resultsState.at > EXPIRED_MS,
    [resultsState?.at],
  )

  // Carrusel 2.0: diseño de cada slide. El fondo «ia» siempre apunta a la
  // última foto generada; sin foto (demo, caducada o error) → banco de la app.
  // Banco: la foto encaja con el tema de la slide (o del carrusel) y no se repite.
  const designs: SlideDesign[] = useMemo(() => {
    const used: string[] = []
    const seed = `${draft.styleId}:${draft.topic}`
    return results.map((r, i) => {
      const role = draft.proposal?.slides[i]?.role ?? (i === 0 ? 'hook' : i === results.length - 1 ? 'cta' : 'desarrollo')
      const text = `${r.text} ${r.support ?? ''} ${draft.topic} ${draft.topicChips.join(' ')}`
      const pick = () => bankPhotoFor(r.visual, i, { text, seed, avoid: used })
      let d = r.design ?? defaultDesign({ styleId: draft.styleId || '', role, index: i, visual: r.visual, imageUrl: r.imageUrl, text, seed, avoid: used })
      if (d.bg.kind === 'photo' && d.bg.source === 'ia') {
        const usable = r.imageUrl && !imagesExpired
        d = { ...d, bg: usable ? { ...d.bg, src: r.imageUrl! } : { kind: 'photo' as const, src: pick(), source: 'banco' as const } }
      }
      if (d.bg.kind === 'photo') used.push(d.bg.src)
      return d
    })
  }, [results, draft.proposal, draft.styleId, draft.topic, draft.topicChips, imagesExpired])

  const changeDesign = (index: number, patch: Partial<SlideDesign>) =>
    patchSlide(index, { design: { ...designs[index], ...patch } })
  const changeDesignAll = (patch: Partial<SlideDesign>) => {
    setResultsState(prev => ({
      ...prev,
      slides: (prev.slides ?? []).map((s, i) => ({ ...s, design: { ...designs[i], ...patch } })),
    }))
    toast.show('Aplicado a todas las slides')
  }
  const changeText = (index: number, text: string, support?: string) => {
    patchSlide(index, { text, support })
    setDraft(p => ({
      ...p,
      proposal: p.proposal
        ? { ...p.proposal, slides: p.proposal.slides.map((s, j) => (j === index ? { ...s, text, support } : s)) }
        : null,
    }))
  }
  const regenerateImage = (index: number, newVisual?: boolean) => {
    if (isDemoMode) {
      // Demo sin IA de imagen: rota por las fotos del banco de la app.
      const r = results[index]
      const cur = designs[index].bg
      const inUse = designs.flatMap(d => (d.bg.kind === 'photo' ? [d.bg.src] : []))
      const text = `${r.text} ${r.support ?? ''} ${draft.topic}`
      let k = index + 1
      let src = bankPhotoFor(r.visual, k, { text, seed: String(Date.now()), avoid: inUse })
      while (cur.kind === 'photo' && src === cur.src && k < index + 6) src = bankPhotoFor(r.visual, ++k, { text, seed: String(Date.now()) })
      patchSlide(index, { design: { ...designs[index], bg: { kind: 'photo', src, source: 'banco' } } })
      toast.show('En la demo usamos fotos del banco; con tu cuenta se genera con IA.', 'info')
      return
    }
    // La foto nueva pasa a ser el fondo de la slide.
    patchSlide(index, { design: { ...designs[index], bg: { kind: 'photo', src: '', source: 'ia' } } })
    void regenerateSlide(index, newVisual ? { newVisual: true } : undefined)
  }

  const effectiveTopic = useMemo(() => {
    const t = draft.topic.trim()
    const chips = draft.topicChips.join(', ')
    return [t, chips].filter(Boolean).join(' · ')
  }, [draft.topic, draft.topicChips])

  // ── helpers de mutación ───────────────────────────────────────────────────

  const patchSlide = (index: number, patch: Partial<SlideResult>) => {
    setResultsState(prev => ({
      ...prev,
      slides: (prev.slides ?? []).map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  const patchProposal = (proposal: CopyProposal) =>
    setDraft(p => ({ ...p, proposal }))

  // ── 1 · estilo ────────────────────────────────────────────────────────────

  const pickStyle = (s: StyleConfig) => {
    setDraft(p => ({ ...p, styleId: s.id, view: 'studio' }))
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  const changeStyle = () => setDraft(p => ({ ...p, view: 'style' }))

  // ── 2 · propuesta de copy ─────────────────────────────────────────────────

  const createProposal = async () => {
    if (proposalBusy) return
    if (!style) return
    if (!effectiveTopic) {
      setProposalError('Cuéntanos de qué quieres hablar (escribe o toca una etiqueta).')
      return
    }
    setProposalError(null)
    setProposalAIDown(false)
    setProposalBusy(true)
    try {
      const prompt = buildCopyPrompt({
        style,
        topic: effectiveTopic,
        slideCount: draft.slideCount,
        brandContext,
        ctaHint: draft.ctaOverride && draft.ctaOverride.mode !== 'auto' ? finalCtaText() : null,
      })
      const content = await generateAIContent(prompt)
      const proposal = parseCopyProposal(content, style, draft.slideCount)
      setProposalIsDemo(false)
      patchProposal(proposal)
      toast.show(`Propuesta creada — ${proposal.slides.length} slides`)
    } catch {
      if (isDemoMode) {
        setProposalIsDemo(true)
        patchProposal(demoProposalFor(draft.styleId))
      } else {
        setProposalError('La IA no está disponible ahora mismo. Inténtalo en unos minutos.')
        setProposalAIDown(true)
      }
    } finally {
      setProposalBusy(false)
    }
  }

  const finalCtaText = (): string => {
    // El CTA efectivo según override manual/word (para hints al generar copy)
    const o = draft.ctaOverride
    if (!o) return draft.proposal?.cta || ''
    if (o.mode === 'manual') return o.text || ''
    if (o.mode === 'comenta_palabra') return ctaTextFor('comenta_palabra', o.word)
    return ctaTextFor(o.mode)
  }

  // ── edición del copy ─────────────────────────────────────────────────────

  const editSlideText = (n: number, text: string, support?: string) => {
    if (!draft.proposal) return
    setDraft(p => ({
      ...p,
      proposal: p.proposal
        ? {
            ...p.proposal,
            slides: p.proposal.slides.map(s => (s.n === n ? { ...s, text, support } : s)),
          }
        : null,
    }))
  }

  const regenerateHook = async () => {
    if (!style || !draft.proposal || hookBusy) return
    setHookBusy(true)
    try {
      const prompt = buildHookPrompt({
        style, topic: effectiveTopic, currentHook: draft.proposal.slides[0].text, brandContext,
      })
      const content = await generateAIContent(prompt)
      const parsed = extractJSON<{ hook?: unknown; support?: unknown }>(content)
      const hook = typeof parsed?.hook === 'string' ? parsed.hook.trim() : ''
      if (!hook) throw new Error('bad_hook')
      editSlideText(1, hook, typeof parsed?.support === 'string' && parsed.support.trim() ? parsed.support.trim() : undefined)
      toast.show('Nuevo gancho listo')
    } catch {
      toast.show('No se pudo regenerar el gancho — prueba otra vez', 'info')
    } finally {
      setHookBusy(false)
    }
  }

  const tweak = async (variant: CopyTweak) => {
    if (!style || !draft.proposal || tweakBusy) return
    setTweakBusy(variant)
    try {
      const prompt = buildTweakPrompt({ variant, style, topic: effectiveTopic, proposal: draft.proposal, brandContext })
      const content = await generateAIContent(prompt)
      const updated = parseCopyProposal(content, style, draft.proposal.slides.length)
      patchProposal(updated)
      toast.show('Copy ajustado')
    } catch {
      toast.show('No se pudo ajustar el copy — prueba otra vez', 'info')
    } finally {
      setTweakBusy(null)
    }
  }

  // ── ajustes opcionales: CTA / firma ─────────────────────────────────────

  const applyCta = async (mode: CtaMode, word?: string, manual?: string) => {
    if (!style || !draft.proposal || ctaBusy) return
    const lastN = draft.proposal.slides[draft.proposal.slides.length - 1].n
    const last = draft.proposal.slides[draft.proposal.slides.length - 1]

    // Sin CTA: strip local, sin llamada.
    if (mode === 'sin_cta') {
      const clean = stripCtaFromText(last.text, draft.proposal.cta) || last.text
      setDraft(p => ({
        ...p,
        ctaOverride: { mode },
        proposal: p.proposal
          ? { ...p.proposal, cta: '', slides: p.proposal.slides.map(s => (s.n === lastN ? { ...s, text: clean } : s)) }
          : null,
      }))
      toast.show('CTA retirado de la última slide')
      return
    }

    // Automático: solo quita el override (el copy queda como está).
    if (mode === 'auto') {
      setDraft(p => ({ ...p, ctaOverride: null }))
      toast.show('CTA automático: dejamos el texto como está', 'info')
      return
    }

    const ctaText = mode === 'manual' ? (manual || '').trim() : ctaTextFor(mode, word)
    if (!ctaText) {
      if (mode === 'comenta_palabra' && !word) toast.show('Escribe la palabra que quieres que comenten', 'info')
      return
    }

    setCtaBusy(true)
    try {
      // Reescritura con IA de la última slide integrando el CTA…
      const prompt = buildCtaRewritePrompt({ style, lastSlide: last, ctaText, brandContext })
      const content = await generateAIContent(prompt)
      const parsed = extractJSON<{ text?: unknown; support?: unknown }>(content)
      const text = typeof parsed?.text === 'string' && parsed.text.trim() ? parsed.text.trim() : null
      const support = typeof parsed?.support === 'string' && parsed.support.trim() ? parsed.support.trim() : undefined
      const finalText = text ?? `${stripCtaFromText(last.text, draft.proposal.cta)} ${ctaText}`.trim()
      setDraft(p => ({
        ...p,
        ctaOverride: { mode, ...(word ? { word: word.trim() } : {}), ...(manual ? { text: manual.trim() } : {}) },
        proposal: p.proposal
          ? { ...p.proposal, cta: ctaText, slides: p.proposal.slides.map(s => (s.n === lastN ? { ...s, text: finalText, support: support ?? s.support } : s)) }
          : null,
      }))
      toast.show('CTA integrado en la última slide')
    } catch {
      // …fallback local para no bloquear el ajuste.
      const finalText = `${stripCtaFromText(last.text, draft.proposal.cta)} ${ctaText}`.trim()
      setDraft(p => ({
        ...p,
        ctaOverride: { mode, ...(word ? { word: word.trim() } : {}), ...(manual ? { text: manual.trim() } : {}) },
        proposal: p.proposal
          ? { ...p.proposal, cta: ctaText, slides: p.proposal.slides.map(s => (s.n === lastN ? { ...s, text: finalText } : s)) }
          : null,
      }))
      toast.show('CTA añadido (sin IA, revisa la última slide)', 'info')
    } finally {
      setCtaBusy(false)
    }
  }

  const changeSignature = (s: Signature) => {
    const text = (s.text || '').trim()
    setDraft(p => ({ ...p, signature: { on: s.on && !!text, text } }))
  }

  // ── generación de imágenes ────────────────────────────────────────────────

  const requestSlide = useCallback(
    async (payload: { styleId: string; draftId: string; index: number; slide: Pick<CopySlide, 'text' | 'support' | 'visual'>; total: number; signature: Signature }) => {
      const res = await fetch('/api/carruseles/slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; imageUrl?: string; imagePath?: string; error?: string; message?: string }
      if (!res.ok || !data?.ok || !data.imageUrl) {
        // La route devuelve { error: codigo, message: mensaje humano }
        const code = data?.error === 'too_many_requests' ? 'rate_limit' : data?.error || 'slide_error'
        const e = new Error(data?.message || data?.error || 'No se pudo generar esta slide.')
        e.name = code
        throw e
      }
      return data
    },
    [],
  )

  const generateCarousel = async () => {
    if (!style || !draft.proposal) return
    const slides = draft.proposal.slides
    const draftId = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const signature = draft.signature

    setDraft(p => ({ ...p, view: 'generating' }))
    setResultsState({
      at: Date.now(),
      draftId,
      slides: slides.map((s, i) => ({ index: i, text: s.text, support: s.support, visual: s.visual, status: 'pending' as const })),
    })

    let unavailable = false
    let okCount = 0
    for (let i = 0; i < slides.length; i++) {
      if (unavailable) {
        patchSlide(i, { status: 'unavailable', error: 'La generación de imágenes no está disponible en esta cuenta todavía.' })
        continue
      }
      if (isDemoMode) {
        patchSlide(i, {
          status: 'unavailable',
          error: 'Ejemplo: sin generación de imágenes en la demo; usamos fotos del banco de la app.',
        })
        continue
      }
      patchSlide(i, { status: 'generating' })
      try {
        const data = await requestSlide({
          styleId: style.id, draftId, index: i,
          slide: { text: slides[i].text, support: slides[i].support, visual: slides[i].visual },
          total: slides.length, signature,
        })
        okCount++
        patchSlide(i, { status: 'ok', imageUrl: data.imageUrl, imagePath: data.imagePath })
      } catch (err) {
        const name = (err as Error).name
        const msg = (err as Error).message
        if (name === 'images_not_available') {
          unavailable = true
          patchSlide(i, { status: 'unavailable', error: 'La generación de imágenes no está disponible en esta cuenta todavía.' })
        } else if (name === 'rate_limit') {
          patchSlide(i, { status: 'error', error: 'Has generado muchas seguidas — espera unos segundos.' })
        } else {
          patchSlide(i, { status: 'error', error: msg || 'No se pudo generar esta slide.' })
        }
      }
    }

    setDraft(p => ({ ...p, view: 'result' }))
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    if (okCount === slides.length && !isDemoMode) toast.show('Carrusel listo')
  }

  const retrySlide = async (index: number) => {
    if (!style || !resultsState.draftId) return
    const r = resultsState.slides[index]
    if (!r) return
    patchSlide(index, { status: 'generating', error: undefined })
    try {
      const data = await requestSlide({
        styleId: style.id,
        draftId: resultsState.draftId,
        index,
        slide: { text: r.text, support: r.support, visual: r.visual },
        total: resultsState.slides.length,
        signature: draft.signature,
      })
      patchSlide(index, { status: 'ok', imageUrl: data.imageUrl, imagePath: data.imagePath })
    } catch (err) {
      const name = (err as Error).name
      patchSlide(index, {
        status: name === 'images_not_available' ? 'unavailable' : 'error',
        error: name === 'images_not_available'
          ? 'La generación de imágenes no está disponible en esta cuenta todavía.'
          : (err as Error).message || 'No se pudo generar esta slide.',
      })
    }
  }

  const regenerateSlide = async (index: number, over?: { text?: string; newVisual?: boolean }) => {
    if (!style || busyIndex !== null || !resultsState.draftId) return
    const r = resultsState.slides[index]
    if (!r) return
    setBusyIndex(index)

    let visual = r.visual
    if (over?.newVisual) {
      // otro encuadre: el primero de la secuencia no usado por las demás
      const used = new Set(resultsState.slides.map((s, i) => (i === index ? null : s.visual)).filter(Boolean))
      const candidates = [
        'lifestyle', 'macro_detail', 'hands_process', 'tools',
        'extensions_material', 'product', 'hero_result', 'salon_env',
      ] as VisualType[]
      visual = candidates.find(v => !used.has(v)) ?? r.visual
      patchSlide(index, { visual })
    }

    const text = over?.text ?? r.text
    if (over?.text) {
      patchSlide(index, { text })
      // el copy aprobado se mantiene en sync para "Regenerar todo"
      setDraft(p => ({
        ...p,
        proposal: p.proposal
          ? { ...p.proposal, slides: p.proposal.slides.map((s, j) => (j === index ? { ...s, text } : s)) }
          : null,
      }))
    }
    patchSlide(index, { status: 'generating', error: undefined })

    try {
      const data = await requestSlide({
        styleId: style.id,
        draftId: resultsState.draftId,
        index,
        slide: { text, support: r.support, visual },
        total: resultsState.slides.length,
        signature: draft.signature,
      })
      patchSlide(index, { status: 'ok', imageUrl: data.imageUrl, imagePath: data.imagePath })
      toast.show(`Slide ${index + 1} actualizada`)
    } catch (err) {
      patchSlide(index, {
        status: 'error',
        error: (err as Error).message || 'No se pudo generar esta slide.',
      })
    } finally {
      setBusyIndex(null)
    }
  }

  const regenerateAll = () => {
    if (!draft.proposal) return
    // regenera con los textos actuales (las ediciones de resultado se
    // sincronizan al draft.proposal en regenerateSlide)
    void generateCarousel()
  }

  // ── acciones de resultado ────────────────────────────────────────────────

  const downloadAll = async () => {
    if (downloading) return
    const okSlides = results.filter(r => r.status === 'ok' && r.imageUrl)
    if (okSlides.length === 0) return
    setDownloading(true)
    toast.show(`Descargando ${okSlides.length} slides…`)
    for (const [k, r] of okSlides.entries()) {
      try {
        const res = await fetch(r.imageUrl!)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `carrusel-${String(k + 1).padStart(2, '0')}.jpg`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch {
        toast.show(`No se pudo descargar la slide ${k + 1}`, 'info')
      }
      await new Promise(res => setTimeout(res, 450))
    }
    setDownloading(false)
  }

  const saveCarousel = async () => {
    if (saving || saved) return
    setSaving(true)
    const topic = draft.topic.trim()
    const payload = {
      type: 'carrusel',
      title: topic ? `Carrusel · ${topic.slice(0, 60)}` : `Carrusel · ${style?.name ?? ''}`,
      content_json: {
        kind: 'premium-carousel',
        style: draft.styleId,
        topic: effectiveTopic,
        signature: draft.signature.on ? draft.signature.text : null,
        cta: draft.proposal?.cta ?? null,
        caption: draft.proposal?.caption ?? null,
        slides: results
          .map((r, i) => ({ n: i + 1, text: r.text, support: r.support ?? null, visual: r.visual, image_path: r.imagePath ?? null, design: designs[i] })),
      },
    }
    const ok = await saveToLibrary(userId, payload, isDemoMode)
    setSaving(false)
    if (ok) {
      setSaved(true)
      toast.show('Guardado en tu biblioteca')
    } else {
      toast.show('No se pudo guardar — prueba otra vez', 'info')
    }
  }

  const newCarousel = () => {
    setDraft(p => ({
      ...EMPTY_DRAFT,
      styleId: p.styleId, // conservamos la dirección creativa elegida
      view: 'studio',
      signature: p.signature,
    }))
    setResultsState({ at: 0, draftId: null, slides: [] })
    setSaved(false)
    setProposalIsDemo(false)
    setProposalError(null)
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (!mounted) {
    return <div className="h-40 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" aria-busy="true" />
  }

  if (draft.view === 'style' || !style) {
    return <StylePicker onPick={pickStyle} />
  }

  if (draft.view === 'generating' && results.length > 0) {
    return (
      <StudioShell style={style} onPanelChangeStyle={changeStyle}>
        <GeneratingView
          style={style}
          total={results.length}
          results={results}
          onRetry={retrySlide}
        />
      </StudioShell>
    )
  }

  if (draft.view === 'result' && results.length > 0) {
    return (
      <ResultGallery
        style={style}
        topic={effectiveTopic}
        results={results}
        designs={designs}
        signature={draft.signature.on ? draft.signature.text : undefined}
        caption={draft.proposal?.caption}
        busyIndex={busyIndex}
        saving={saving}
        saved={saved}
        imagesExpired={imagesExpired}
        onDesignChange={changeDesign}
        onDesignAll={changeDesignAll}
        onTextChange={changeText}
        onRegenerateImage={regenerateImage}
        onRegenerateAll={regenerateAll}
        onSave={saveCarousel}
        onNew={newCarousel}
        extraActions={<AddToPlanButton userId={userId} className="btn-secondary" getPayload={() => ({
          type: 'carrusel',
          title: (results[0]?.text || effectiveTopic).replace(/\*\*/g, ''),
          service: draft.topicChips[0] ?? null,
          content_json: {
            slides: results.map((r, i) => ({ number: i + 1, role: draft.proposal?.slides[i]?.role ?? '', text: r.text.replace(/\*\*/g, ''), support: r.support ?? null })),
            designs, styleId: draft.styleId,
          },
          caption_with_hashtags: draft.proposal?.caption ?? null,
          format: `Carrusel ${results.length} slides`,
        })} />}
      />
    )
  }

  // studio por defecto
  return (
    <StudioShell style={style} onPanelChangeStyle={changeStyle}>
      <CopyStudio
        style={style}
        topic={draft.topic}
        chips={draft.topicChips}
        slideCount={draft.slideCount}
        proposal={draft.proposal}
        proposalBusy={proposalBusy}
        proposalError={proposalError}
        proposalIsDemo={proposalIsDemo}
        proposalAIDown={proposalAIDown}
        hookBusy={hookBusy}
        tweakBusy={tweakBusy}
        ctaBusy={ctaBusy}
        ctaOverride={draft.ctaOverride}
        signature={draft.signature}
        generating={draft.view === 'generating'}
        onTopicChange={v => setDraft(p => ({ ...p, topic: v }))}
        onToggleChip={chip =>
          setDraft(p => ({
            ...p,
            topicChips: p.topicChips.includes(chip) ? p.topicChips.filter(c => c !== chip) : [...p.topicChips, chip],
          }))
        }
        onSlideCountChange={n => setDraft(p => ({ ...p, slideCount: n }))}
        onCreateProposal={createProposal}
        onEditSlideText={editSlideText}
        onRegenerateHook={regenerateHook}
        onTweak={tweak}
        onApplyCta={applyCta}
        onSignatureChange={changeSignature}
        onGenerate={generateCarousel}
      />
    </StudioShell>
  )
}

/* ── Layout de dos columnas: config a la izquierda, estilo sticky a la derecha ── */

function StudioShell({ style, onPanelChangeStyle, children }: {
  style: StyleConfig
  onPanelChangeStyle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
      {/* Mobile: la referencia del estilo SIEMPRE arriba */}
      <div className="order-first lg:hidden">
        <StyleSidePanel style={style} onChangeStyle={onPanelChangeStyle} />
      </div>
      <div className="min-w-0 order-2 lg:order-none">{children}</div>
      <div className="order-3 lg:order-none">
        <div className="hidden lg:block">
          <StyleSidePanel style={style} onChangeStyle={onPanelChangeStyle} />
        </div>
      </div>
    </div>
  )
}

/* useSessionState ya cubre la persistencia del draft y del resultado. */