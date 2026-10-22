'use client'
/**
 * ESTUDIO DE COPY — columna izquierda del "studio".
 *
 * 01 · ¿De qué quieres hablar?  (input amplio + chips + Nº slides AUTO)
 * 02 · Propuesta editable inline + tweaks discretos + wireframe previsto
 * 03 · Ajustes opcionales (CTA / firma) — NO interrumpe el flujo
 * 04 · Generar carrusel
 *
 * Presentacional puro: los datos y acciones llegan por props (CarruselesClient).
 */
import { useRef, useState, useEffect } from 'react'
import { ArrowRight, ChevronDown, Lock, RefreshCw, Wand2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import type {
  CopyProposal,
  CopySlide,
  CtaMode,
  CtaOverride,
  Signature,
  StyleConfig,
} from '@/lib/carruseles/types'
import { visualTypeLabel } from '@/lib/carruseles/styles'
import WireframeStrip from './WireframeStrip'

export type CopyTweak = 'breve' | 'premium' | 'directo' | 'educativo' | 'emocional'

interface Props {
  style: StyleConfig
  topic: string
  chips: string[]
  slideCount: number | 'auto'
  proposal: CopyProposal | null
  proposalBusy: boolean
  proposalError: string | null
  proposalIsDemo: boolean
  hookBusy: boolean
  tweakBusy: CopyTweak | null
  ctaBusy: boolean
  ctaOverride: CtaOverride | null
  signature: Signature
  generating: boolean
  onTopicChange: (v: string) => void
  onToggleChip: (chip: string) => void
  onSlideCountChange: (n: number | 'auto') => void
  onCreateProposal: () => void
  onEditSlideText: (n: number, text: string, support?: string) => void
  onRegenerateHook: () => void
  onTweak: (v: CopyTweak) => void
  onApplyCta: (o: CtaMode, word?: string, manual?: string) => void
  onSignatureChange: (s: Signature) => void
  onGenerate: () => void
}

const TOPIC_CHIPS = [
  'Rubios', 'Balayage', 'Color', 'Extensiones', 'Densidad', 'Cuidado capilar',
  'Tratamientos', 'Corte', 'Tendencias', 'Resultados',
]
const COUNTS: (number | 'auto')[] = ['auto', 2, 3, 4, 5, 6]

const CTA_OPTIONS: { mode: CtaMode; label: string }[] = [
  { mode: 'auto', label: 'Automático' },
  { mode: 'escribenos', label: 'Escríbenos' },
  { mode: 'reserva', label: 'Reserva' },
  { mode: 'comenta', label: 'Comenta' },
  { mode: 'comenta_palabra', label: 'Comenta una palabra' },
  { mode: 'guarda', label: 'Guarda' },
  { mode: 'comparte', label: 'Comparte' },
  { mode: 'sin_cta', label: 'Sin CTA' },
  { mode: 'manual', label: 'Escribir manualmente' },
]

const WORD_COUNT_SOFT = 22

const ROLE_LABEL: Record<string, string> = {
  hook: 'Gancho',
  desarrollo: 'Valor',
  cierre: 'Cierre',
  cta: 'CTA',
}

export default function CopyStudio(props: Props) {
  const { style, proposal } = props
  const propuestaRef = useRef<HTMLDivElement | null>(null)
  const prevProposalRef = useRef<CopyProposal | null>(null)
  const [ajustesOpen, setAjustesOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [ctaMode, setCtaMode] = useState<CtaMode>('auto')
  const [ctaWord, setCtaWord] = useState<Record<string, string>>({})
  const [ctaManual, setCtaManual] = useState('')

  // El scroll acompaña a la propuesta cuando aparece (una única vez).
  useEffect(() => {
    if (proposal && !prevProposalRef.current && propuestaRef.current) {
      propuestaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevProposalRef.current = proposal
  }, [proposal])

  // Hidratación única desde el draft persistido (CTA/firma elegidos).
  useEffect(() => {
    if (hydrated) return
    setCtaMode(props.ctaOverride?.mode ?? 'auto')
    if (props.ctaOverride?.word) setCtaWord(w => ({ ...w, comenta_palabra: props.ctaOverride!.word! }))
    if (props.ctaOverride?.text) setCtaManual(props.ctaOverride.text)
    setHydrated(true)
  }, [props.ctaOverride, hydrated])

  const ctaWordFor = () => ctaWord.comenta_palabra ?? ''

  return (
    <div className="scroll-mt-24 lg:scroll-mt-28">
      <div className="hidden lg:block">
        <p className="text-[11px] uppercase tracking-[0.25em] text-cherry/50 mb-2">Tu carrusel · {style.name}</p>
        <h2
          className="text-2xl md:text-[28px] text-ink leading-snug mb-6"
          style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}
        >
          {proposal ? 'Revisa y ajusta tu carrusel' : '¿De qué quieres hablar?'}
        </h2>
      </div>

      {/* ── 01 · IDEA ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[var(--radius-md)] border border-[rgba(122,24,50,0.1)] p-5 md:p-6 shadow-[0_2px_16px_rgba(74,52,40,0.05)]">
        <label
          htmlFor="tema-carrusel"
          className="block text-[11px] uppercase tracking-[0.2em] text-cherry/60 mb-3"
        >
          ¿De qué quieres hablar?
        </label>
        <textarea
          id="tema-carrusel"
          rows={5}
          value={props.topic}
          onChange={e => props.onTopicChange(e.target.value)}
          placeholder={
            'Ej. Muchas clientas piensan que las extensiones solo sirven para tener el cabello más largo, pero también nos ayudan a recuperar densidad cuando hay zonas con poco cabello…'
          }
          maxLength={1200}
          className="input-field resize-y text-[15px] leading-relaxed placeholder:text-ink/35"
        />

        {/* Chips — nunca obligatorios */}
        <div className="mt-4">
          {props.chips.length === 0 && (
            <p className="text-xs text-ink/45 mb-2.5">¿No sabes por dónde empezar? Toca lo que te pinta:</p>
          )}
          <div className="flex flex-wrap gap-2">
            {TOPIC_CHIPS.map(chip => {
              const active = props.chips.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => props.onToggleChip(chip)}
                  className="text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200"
                  style={{
                    borderColor: active ? style.accentColor : 'rgba(34,32,30,0.14)',
                    background: active ? `${style.accentColor}14` : 'transparent',
                    color: active ? style.accentColor : 'rgba(34,32,30,0.62)',
                  }}
                >
                  {chip}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nº slides — AUTO recomendado */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/55 mr-1.5">Nº de slides</p>
          {COUNTS.map(c => {
            const active = props.slideCount === c
            return (
              <button
                key={String(c)}
                type="button"
                onClick={() => props.onSlideCountChange(c)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all"
                style={{
                  borderColor: active ? style.accentColor : 'rgba(34,32,30,0.14)',
                  background: active ? style.accentColor : 'transparent',
                  color: active ? '#fff' : 'rgba(34,32,30,0.62)',
                }}
              >
                {c === 'auto' ? 'Auto' : c}
              </button>
            )
          })}
          {props.slideCount === 'auto' && (
            <span className="text-[11px] text-ink/45">Decidimos el número ideal según tu idea.</span>
          )}
        </div>

        <div className="mt-6">
          <Button
            variant="primary"
            size="lg"
            loading={props.proposalBusy}
            icon={props.proposalBusy ? undefined : <Wand2 className="w-4 h-4" />}
            onClick={props.onCreateProposal}
            disabled={props.proposalBusy || (!props.topic.trim() && props.chips.length === 0)}
          >
            {proposal ? 'Recrear propuesta' : 'Crear propuesta'}
          </Button>
          <p className="mt-2.5 text-xs text-ink/45">
            Primero el texto. Las imágenes se generan cuando el copy está aprobado.
          </p>
        </div>
      </div>

      {/* ── 02 · PROPUESTA EDITABLE ────────────────────────────────────── */}
      {props.proposalError && !props.proposal && (
        <div className="mt-4 p-4 rounded-[var(--radius-sm)] bg-white border border-[rgba(122,24,50,0.2)]">
          <p className="text-sm text-cherry-dark">{props.proposalError}</p>
        </div>
      )}

      <div ref={propuestaRef} className="scroll-mt-32">
        {proposal && (
          <div className="mt-8">
            <div className="flex items-end justify-between gap-4 mb-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cherry/55">
                Propuesta · {proposal.slides.length} slides
              </p>
              <p className="text-[11px] text-ink/45">Toca cualquier frase para cambiarla</p>
            </div>

            {props.proposalIsDemo && (
              <div className="mb-4 px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--color-warm-gray)] border border-ink/10">
                <p className="text-xs text-ink/60 leading-relaxed">
                  <span className="font-semibold text-cherry-dark">Ejemplo</span> · La IA no está
                  disponible ahora: este es un carrusel de ejemplo para explorar el flujo. Puedes
                  editar todo lo que ves.
                </p>
              </div>
            )}

            {/* Tarjetas editables */}
            <div className="space-y-3">
              {proposal.slides.map((slide, i) => (
                <ProposalCard
                  key={`${slide.n}-${i}`}
                  n={i + 1}
                  total={proposal.slides.length}
                  slide={slide}
                  onEdit={(text, support) => props.onEditSlideText(slide.n, text, support)}
                />
              ))}
            </div>

            {/* Tweaks discretos */}
            <div className="mt-4 flex flex-wrap gap-2">
              <TweakButton
                label="Regenerar hook"
                icon="refresh"
                busy={props.hookBusy}
                onClick={props.onRegenerateHook}
                disabled={props.tweakBusy !== null || props.ctaBusy}
              />
              {(['breve', 'premium', 'directo', 'educativo', 'emocional'] as CopyTweak[]).map(v => (
                <TweakButton
                  key={v}
                  label={tweakLabel(v)}
                  icon="wand"
                  busy={props.tweakBusy === v}
                  onClick={() => props.onTweak(v)}
                  disabled={props.hookBusy || (props.tweakBusy !== null && props.tweakBusy !== v) || props.ctaBusy}
                />
              ))}
            </div>

            {/* Wireframe: qué visual tendrá cada slide */}
            <WireframeStrip proposal={proposal} />

            {/* ── 03 · AJUSTES OPCIONALES ─────────────────────────────── */}
            <div className="mt-6 bg-white rounded-[var(--radius-md)] border border-[rgba(122,24,50,0.1)]">
              <button
                type="button"
                onClick={() => setAjustesOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <span className="text-[11px] uppercase tracking-[0.2em] text-cherry/60">
                  Ajustes opcionales
                </span>
                <span className="flex items-center gap-2">
                  {props.ctaOverride && (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-cherry/60">CTA</span>
                  )}
                  {props.signature.on && (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-cherry/60">Firma</span>
                  )}
                  <ChevronDown
                    className="w-4 h-4 text-ink/50 transition-transform duration-200"
                    style={{ transform: ajustesOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </span>
              </button>

              {ajustesOpen && (
                <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CTA */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-2.5">
                      CTA de la última slide
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {CTA_OPTIONS.map(o => {
                        const active = ctaMode === o.mode
                        return (
                          <button
                            key={o.mode}
                            type="button"
                            disabled={props.ctaBusy}
                            onClick={() => {
                              setCtaMode(o.mode)
                              if (o.mode === 'comenta_palabra' && !ctaWordFor().trim()) return
                              if (o.mode === 'manual' && !ctaManual.trim()) return
                              if (o.mode !== 'auto') props.onApplyCta(o.mode, ctaWordFor() || undefined, ctaManual || undefined)
                            }}
                            className="text-[11px] px-3 py-1.5 rounded-full border transition-all disabled:opacity-60"
                            style={{
                              borderColor: active ? style.accentColor : 'rgba(34,32,30,0.14)',
                              background: active ? style.accentColor : 'transparent',
                              color: active ? '#fff' : 'rgba(34,32,30,0.62)',
                            }}
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                    {ctaMode === 'comenta_palabra' && (
                      <input
                        className="input-field mt-3 text-sm"
                        placeholder="Palabra (ej. DENSIDAD)"
                        value={ctaWordFor()}
                        onChange={e => setCtaWord(w => ({ ...w, comenta_palabra: e.target.value }))}
                        onBlur={() => { if (ctaWordFor().trim()) props.onApplyCta('comenta_palabra', ctaWordFor().trim()) }}
                      />
                    )}
                    {ctaMode === 'manual' && (
                      <input
                        className="input-field mt-3 text-sm"
                        placeholder="Tu CTA exacto"
                        value={ctaManual}
                        onChange={e => setCtaManual(e.target.value)}
                        onBlur={() => { if (ctaManual.trim()) props.onApplyCta('manual', undefined, ctaManual.trim()) }}
                      />
                    )}
                    {props.ctaBusy && (
                      <p className="mt-2 text-[11px] text-ink/50 animate-pulse">Integrando el CTA…</p>
                    )}
                  </div>

                  {/* Firma */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55">Firma del salón</p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={props.signature.on}
                        onClick={() =>
                          props.onSignatureChange({ on: !props.signature.on, text: props.signature.text })
                        }
                        className="relative w-10 h-[22px] rounded-full transition-colors"
                        style={{ background: props.signature.on ? style.accentColor : 'rgba(34,32,30,0.18)' }}
                      >
                        <span
                          className="absolute top-[3px] w-4 h-4 bg-white rounded-full transition-all duration-200 shadow"
                          style={{ left: props.signature.on ? 21 : 3 }}
                        />
                      </button>
                    </div>
                    <input
                      className="input-field text-sm"
                      placeholder="@salón · Nombre · Texto libre"
                      maxLength={48}
                      value={props.signature.text}
                      onChange={e =>
                        props.onSignatureChange({ on: e.target.value.trim().length > 0, text: e.target.value })
                      }
                    />
                    <p className="mt-2 text-xs text-ink/45">
                      Aparece pequeña y discreta abajo, integrada editorialmente. Sin logo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 04 · GENERAR ───────────────────────────────────────────────── */}
        {proposal && (
          <div className="mt-7 flex items-center gap-4 flex-wrap pb-2">
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-4 h-4 rotate-90" />}
              onClick={props.onGenerate}
              disabled={props.generating || props.proposalBusy || props.tweakBusy !== null}
            >
              Generar carrusel
            </Button>
            <p className="text-xs text-ink/50 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              El copy queda bloqueado y creamos las imágenes una a una.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tarjeta de slide editable (clic directo sobre la frase) ───────────────── */

function ProposalCard({ n, total, slide, onEdit }: {
  n: number
  total: number
  slide: CopySlide
  onEdit: (text: string, support?: string) => void
}) {
  const words = slide.text.trim().split(/\s+/).filter(Boolean).length
  const over = words > WORD_COUNT_SOFT
  const [draft, setDraft] = useState(slide.text)
  const [draftSupport, setDraftSupport] = useState(slide.support ?? '')

  useEffect(() => {
    setDraft(slide.text)
    setDraftSupport(slide.support ?? '')
  }, [slide.text, slide.support])

  const commitText = () => {
    const next = draft.trim()
    if (next && next !== slide.text) onEdit(next, draftSupport.trim() || undefined)
    else if (next !== slide.text) setDraft(slide.text)
  }

  return (
    <div className="group relative bg-white rounded-[var(--radius-sm)] border border-[rgba(122,24,50,0.1)] hover:border-[rgba(122,24,50,0.25)] transition-colors p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-cherry-dark">
            {String(n).padStart(2, '0')}
            <span className="text-ink/30"> / {String(total).padStart(2, '0')}</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-ink/45 border border-ink/10 rounded-full px-2 py-0.5">
            {ROLE_LABEL[slide.role]}
          </span>
          {over && <span className="text-[10px] text-amber-700">{words} palabras — quizá demasiado</span>}
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink/40">
          {visualTypeLabel(slide.visual)}
        </span>
      </div>

      <textarea
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitText}
        className="w-full bg-[rgba(74,52,40,0.03)] focus:bg-white border border-transparent focus:border-[rgba(122,24,50,0.25)] rounded-[6px] px-3.5 py-3 outline-none resize-none transition-colors text-[16px] leading-relaxed text-ink tracking-wide"
        style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 500 }}
      />

      <input
        value={draftSupport}
        onChange={e => setDraftSupport(e.target.value)}
        onBlur={() => {
          if (draftSupport.trim() !== (slide.support ?? '')) onEdit(slide.text, draftSupport.trim() || undefined)
        }}
        placeholder="Micro-línea de apoyo (opcional)"
        className="mt-1.5 w-full bg-transparent border border-transparent focus:border-[rgba(122,24,50,0.18)] hover:border-[rgba(122,24,50,0.12)] rounded-[6px] px-3 py-1 outline-none text-[10px] uppercase tracking-[0.18em] text-ink/70 transition-colors"
      />
    </div>
  )
}

/* ── Helpers locales ────────────────────────────────────────────────────────── */

function TweakButton({ label, icon, busy, onClick, disabled }: {
  label: string
  icon: 'refresh' | 'wand'
  busy: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-cherry/70 border border-[rgba(122,24,50,0.16)] rounded-full px-3.5 py-2 hover:bg-[rgba(122,24,50,0.05)] hover:text-cherry transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon === 'refresh' ? (
        <RefreshCw className="w-3 h-3" />
      ) : (
        <Wand2 className="w-3 h-3" />
      )}
      {label}
    </button>
  )
}

function tweakLabel(v: CopyTweak): string {
  switch (v) {
    case 'breve': return 'Más breve'
    case 'premium': return 'Más premium'
    case 'directo': return 'Más directo'
    case 'educativo': return 'Más educativo'
    case 'emocional': return 'Más emocional'
  }
}