'use client'
/**
 * Wizard de onboarding — FASE 1 (Business Brain).
 *
 * 8 preguntas validadas (docs/BUSINESS-BRAIN.md §6): el usuario cuenta su
 * negocio, BRÄVE toma las decisiones de marketing. Una decisión por pantalla,
 * priorización única (sin "quiero todo"), cero jerga de marketing.
 *
 * Dos modos por la misma route (spec §9):
 *   - onboarding: usuario nuevo → genera la estrategia al final.
 *   - edit: retomado desde "Actualizar mi marca" (precargado; NO regenera).
 *
 * Guardado incremental en localStorage (interrupción sin perder respuestas).
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Profile, BrandProfile } from '@/types/database'
import { fbqTrack } from '@/lib/pixel-track'
import BraviMascot from '@/components/bravi/BraviMascot'
import { TEAM_INFO_LABELS, type TeamInfoValue } from '@/lib/ai/brain-grammar'

const SERVICES = [
  'Balayage', 'Rubios', 'Canas', 'Alisados', 'Tratamientos', 'Corte',
  'Color', 'Mechas', 'Keratina', 'Decoloración', 'Extensiones', 'Peinados',
]

const DIFF_OPTIONS = [
  { id: 'calidad', label: 'La calidad de mi trabajo' },
  { id: 'especializacion', label: 'Mi especialización y experiencia' },
  { id: 'naturales', label: 'Los resultados naturales' },
  { id: 'transformaciones', label: 'Las transformaciones que consigo' },
  { id: 'asesoramiento', label: 'El cuidado y asesoramiento que doy' },
  { id: 'otra', label: 'Otra (te cuento)' },
  { id: 'no_claro', label: 'Todavía no lo tengo claro' },
]

// Labels de UI en 1ª persona (los de brain-grammar son para el contexto IA).
const PRIORITY_OPTIONS = [
  { id: 'citas', label: 'Conseguir más citas' },
  { id: 'descubrir', label: 'Conseguir que más personas descubran mi trabajo' },
  { id: 'reconocimiento', label: 'Que me reconozcan como especialista' },
  { id: 'servicio', label: 'Vender más un servicio concreto' },
  { id: 'constancia', label: 'Ser más constante (me cuesta saber qué publicar)' },
  { id: 'valor', label: 'Aumentar el valor de mis servicios' },
] as const

const FACE_OPTIONS = [
  { id: 'talk', label: 'Salgo a cámara y hablo' },
  { id: 'appear', label: 'Aparezco, pero prefiero no hablar' },
  { id: 'work_only', label: 'Solo muestro mi trabajo' },
  { id: 'no', label: 'Todavía no salgo' },
] as const

const DRAFT_KEY = 'brave_session_u:'
const DRAFT_SUFFIX = ':onboarding:draft'

interface WizardDraft {
  fullName: string
  salonName: string
  teamInfo: TeamInfoValue | ''
  services: string[]
  star: string
  diffChoice: string
  diffText: string
  priority: string
  showsFace: string
}

const EMPTY_DRAFT: WizardDraft = {
  fullName: '', salonName: '', teamInfo: '', services: [], star: '',
  diffChoice: '', diffText: '', priority: '', showsFace: '',
}

type Mode = 'onboarding' | 'edit'

interface Props {
  profile?: Profile | null
  brand?: Partial<BrandProfile> | null
  mode?: Mode
  demoMode?: boolean
}

export default function OnboardingClient({ profile, brand, mode = 'onboarding', demoMode }: Props) {
  const isEdit = mode === 'edit'
  const needsFullName = !profile?.full_name

  const initialDraft = useMemo<WizardDraft>(() => {
    if (isEdit) {
      return {
        ...EMPTY_DRAFT,
        salonName: profile?.salon_name || '',
        teamInfo: ((brand?.team_info as TeamInfoValue) || '') as WizardDraft['teamInfo'],
        services: brand?.main_services || [],
        star: brand?.service_to_promote || '',
        // En modo edición, la valoración existente viaja como texto libre.
        diffChoice: brand?.differentiation ? 'otra' : 'no_claro',
        diffText: brand?.differentiation || '',
        priority: brand?.main_priority || '',
        showsFace: brand?.shows_face || '',
      }
    }
    return { ...EMPTY_DRAFT, salonName: profile?.salon_name || '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [draft, setDraft] = useState<WizardDraft>(initialDraft)
  const [showOtherService, setShowOtherService] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [autoStarNote, setAutoStarNote] = useState('')
  const [phase, setPhase] = useState<'form' | 'saving' | 'ready' | 'partial'>('form')
  const [error, setError] = useState('')

  const userId = profile?.id || 'anon'

  // Restaurar el borrador (modo onboarding): interrupción sin perder nada.
  // En demo también persiste (misma UX de interrupción).
  useEffect(() => {
    if (isEdit) return
    try {
      const raw = localStorage.getItem(`${DRAFT_KEY}${userId}${DRAFT_SUFFIX}`)
      if (raw) {
        const stored = JSON.parse(raw) as Partial<WizardDraft>
        if (stored && typeof stored === 'object') {
          setDraft(d => ({ ...d, ...stored, salonName: stored.salonName || d.salonName }))
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistencia incremental del borrador.
  useEffect(() => {
    if (isEdit) return
    try { localStorage.setItem(`${DRAFT_KEY}${userId}${DRAFT_SUFFIX}`, JSON.stringify(draft)) } catch { /* ignore */ }
  }, [draft, isEdit, userId])

  // Meta Pixel: vuelta del checkout de Stripe (?checkout=success) → pago completado.
  // La conversión se dispara UNA vez por navegador (localStorage) y se limpia la query.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('checkout') !== 'success') return
    try {
      if (localStorage.getItem('brave_fbq_checkout_done') === '1') return
      localStorage.setItem('brave_fbq_checkout_done', '1')
    } catch { /* ignore */ }
    fbqTrack('CompleteRegistration', { source: 'stripe_checkout' })
    window.history.replaceState(null, '', '/onboarding')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patch(d: Partial<WizardDraft>) {
    setDraft(prev => ({ ...prev, ...d }))
  }

  function toggleService(s: string) {
    setDraft(prev => {
      const next = prev.services.includes(s) ? prev.services.filter(x => x !== s) : [...prev.services, s]
      // Si la estrella sale de la lista, con un único servicio es ella; si no, se re-pregunta.
      const star = next.includes(prev.star) ? prev.star : next.length === 1 ? next[0] : ''
      return { ...prev, services: next, star }
    })
  }

  function goFromServices() {
    if (draft.services.length === 0) { setError('Elige al menos un servicio.'); return }
    setError('')
    // Auto-skip: un solo servicio → es la estrella.
    if (draft.services.length === 1) {
      const theOne = draft.services[0]
      setDraft(prev => ({ ...prev, star: theOne }))
      setAutoStarNote(`Vale, tu estrella es ${theOne}.`)
      setStep(4)
      return
    }
    setStep(3)
  }

  function goFromStar() {
    if (!draft.star) { setError('Elige tu servicio estrella.'); return }
    setError('')
    setStep(4)
  }

  function goFromDiff() {
    // Saltable de facto: "Todavía no lo tengo claro" = skip.
    if (draft.diffChoice === 'otra' && !draft.diffText.trim()) {
      setError('Cuéntame en una frase, o elige "Todavía no lo tengo claro".')
      return
    }
    setError('')
    setStep(5)
  }

  async function finish() {
    if (!draft.priority) { setError('Elige por dónde quieres empezar.'); return }
    if (!draft.showsFace) { setError('Elige cómo te sientes creando contenido.'); return }
    setError('')
    setPhase('saving')

    const differentiation =
      draft.diffChoice === 'no_claro' ? null
      : draft.diffChoice === 'otra' ? draft.diffText.trim() || null
      : DIFF_OPTIONS.find(o => o.id === draft.diffChoice)?.label || null

    const payload = {
      full_name: needsFullName ? draft.fullName.trim() : undefined,
      salon_name: draft.salonName.trim(),
      team_info: draft.teamInfo || undefined,
      main_services: draft.services,
      service_to_promote: draft.star || draft.services[0],
      differentiation,
      main_priority: draft.priority,
      shows_face: draft.showsFace,
      regenerate: isEdit ? false : undefined,
    }

    const goToInicio = (delay = 1600) => {
      if (!isEdit) {
        try { localStorage.removeItem(`${DRAFT_KEY}${userId}${DRAFT_SUFFIX}`) } catch { /* ignore */ }
      }
      setTimeout(() => { window.location.href = '/inicio' }, delay)
    }

    // ── Demo: sin backend, mock de estrategia en localStorage ──────
    if (demoMode) {
      try {
        const stored = JSON.parse(localStorage.getItem('brave_demo_brand') || 'null') || {}
        localStorage.setItem('brave_demo_brand', JSON.stringify({
          ...stored,
          main_services: payload.main_services,
          service_to_promote: payload.service_to_promote,
          team_info: payload.team_info,
          differentiation: payload.differentiation,
          main_priority: payload.main_priority,
          shows_face: payload.shows_face,
          completion_status: 'complete',
          strategy_json: mockStrategy(payload, stored),
          updated_at: new Date().toISOString(),
        }))
      } catch { /* ignore */ }
      setPhase('ready')
      goToInicio(1400)
      return
    }

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok && res.status !== 429) throw new Error('failed')
      const json = res.ok ? await res.json() : { completion: 'partial' }
      if (json.completion === 'complete') {
        setPhase('ready')
        goToInicio()
      } else {
        setPhase('partial')
        goToInicio(2200)
      }
    } catch {
      setPhase('partial')
      goToInicio(2200)
    }
  }

  // ── Estilos (tokens del design system) ───────────────────────────
  const selectedStyle = { background: 'var(--color-cherry)', color: 'white', border: '1.5px solid var(--color-cherry)' as const }
  const unselectedStyle = { background: 'var(--color-cream)', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' as const }
  const inputStyle = {
    border: '1.5px solid rgba(122,24,50,0.2)',
    background: 'var(--color-cream)',
  }
  const braviBox = 'rounded-[var(--radius-md)] p-4 flex items-start gap-3 bg-buttermilk'

  const visibleSteps = draft.services.length === 1 ? [1, 2, 4, 5] : [1, 2, 3, 4, 5]
  const stepName = (s: number) =>
    s === 1 ? 'Tu salón' : s === 2 ? 'Tus servicios' : s === 3 ? 'Tu estrella' : s === 4 ? 'Lo que te define' : 'Por dónde empezar'

  // ── Pantalla final (recompensa) ──────────────────────────────────
  if (phase === 'saving' || phase === 'ready' || phase === 'partial') {
    const name = (needsFullName ? draft.fullName.trim() : profile?.full_name) || ''
    const firstName = name.split(' ')[0]
    return (
      <Shell>
        <div className="text-center">
          <BraviMascot size={110} showMessage message={
            phase === 'ready' ? '¡Tu estrategia está lista!'
            : phase === 'partial' ? 'Ya te conozco. Tu estrategia te espera en Mi Marca.'
            : isEdit ? 'Un segundo, actualizando tu marca…'
            : 'Estoy preparando tu estrategia…'
          } className="mb-6" />
          <h1 className="text-2xl font-bold text-cherry-dark mb-3">
            {phase === 'saving' && isEdit ? 'Guardando…' : phase === 'saving' ? `Ya te conozco${firstName ? `, ${firstName}` : ''}.` : '¡Todo listo!'}
          </h1>
          <p className="text-sm text-cherry-dark opacity-70 mb-8">
            {phase === 'ready' && (isEdit ? 'Tu marca está actualizada.' : 'Tu estrategia BRÄVE está lista. Te llevo al inicio.')}
            {phase === 'partial' && 'Podrás generar tu estrategia en Mi Marca cuando quieras.'}
            {phase === 'saving' && (isEdit ? 'Esto es cosa de segundos.' : 'Voy a pensar lo mejor para tu salón. Cuenta hasta 20…')}
          </p>
        </div>
      </Shell>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────
  return (
    <Shell>
      {step === 0 ? (
        <div className="text-center">
          <BraviMascot
            size={120}
            showMessage
            message={isEdit ? '¡Hola de nuevo! Vamos a actualizar tu marca.' : '¡Hola! Soy Bravi, tu directora de marketing.'}
            className="mb-6"
          />
          <h1 className="text-2xl font-bold text-cherry-dark mb-3">
            {isEdit ? 'Actualicemos tu marca' : 'Bienvenida a BRÄVE Studio'}
          </h1>
          <p className="text-sm leading-relaxed text-cherry-dark opacity-80 mb-4">
            {isEdit
              ? 'Revisemos juntos lo que sé de ti y tu salón. Solo toca lo que quieras cambiar.'
              : 'En 2 minutos conoceré tu salón y te diré qué hacer para crecer.'}
          </p>
          <button
            type="button"
            onClick={() => setShowWhy(v => !v)}
            className="text-xs text-cherry underline underline-offset-2 mb-4"
          >
            ¿Por qué necesito conocer tu negocio?
          </button>
          {showWhy && (
            <p className="text-xs leading-relaxed text-cherry-dark opacity-70 mb-6 max-w-sm mx-auto">
              Porque tu contenido no debe parecer el de otro salón. Con esto BRÄVE elige por ti qué publicar,
              con qué tono y para qué objetivo — tú solo grabas y publicas.
            </p>
          )}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-3 rounded-[var(--radius-md)] font-semibold text-sm bg-cherry text-white cursor-pointer hover:opacity-90 transition-opacity"
          >
            {isEdit ? 'Repasar' : 'Empezar'}
          </button>
        </div>
      ) : (
        <div>
          {/* Progreso */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {visibleSteps.map(vs => {
              const pos = visibleSteps.indexOf(vs)
              const active = visibleSteps.indexOf(step)
              return (
                <div
                  key={vs}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: vs === step ? 32 : 8,
                    background: active >= 0 && pos <= active ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                  }}
                />
              )
            })}
          </div>

          {/* Bravi guía */}
          <div className={braviBox + ' mb-5'}>
            <img
              src="/bravi2.png" alt="Bravi" className="flex-shrink-0 bravi-float"
              style={{ width: 28, height: 28, objectFit: 'contain' }} draggable={false}
            />
            <p className="text-sm text-cherry-dark">
              {step === 1 && 'Cuéntame lo básico.'}
              {step === 2 && '¿Qué servicios haces? Elige todos los que hagas.'}
              {step === 3 && (autoStarNote || 'Si tuvieras la agenda llena de UNO de estos servicios, ¿cuál elegirías?')}
              {step === 4 && '¿Qué te gustaría que una nueva clienta valorase especialmente de ti?'}
              {step === 5 && 'Último paso: dime por dónde empezar y cómo te ves tú.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Paso 1 — Tu salón */}
            {step === 1 && (
              <motion.div key="s1" {...anim} className="space-y-4">
                {needsFullName && (
                  <Field label="¿Cómo te llamas?">
                    <input type="text" value={draft.fullName} placeholder="Ej. Marta García"
                      onChange={e => setDraft(d => ({ ...d, fullName: e.target.value }))}
                      className={inputClass} style={inputStyle} />
                  </Field>
                )}
                <Field label="¿Cómo se llama tu salón, tu marca o tú misma?">
                  <input type="text" value={draft.salonName} placeholder='Ej. "Studio Marta" o "Marta López"'
                    onChange={e => setDraft(d => ({ ...d, salonName: e.target.value }))}
                    className={inputClass} style={inputStyle} />
                </Field>
                <Field label="¿Dónde trabajas?">
                  <div className="space-y-2">
                    {(Object.entries(TEAM_INFO_LABELS) as [TeamInfoValue, string][]).map(([id, label]) => (
                      <Option key={id} label={label} selected={draft.teamInfo === id}
                        onClick={() => setDraft(d => ({ ...d, teamInfo: id }))} />
                    ))}
                  </div>
                </Field>
              </motion.div>
            )}

            {/* Paso 2 — Servicios (factual, multiselección) */}
            {step === 2 && (
              <motion.div key="s2" {...anim} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => {
                    const on = draft.services.includes(s)
                    return (
                      <button key={s} type="button"
                        onClick={() => toggleService(s)}
                        className="px-4 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                        style={on ? selectedStyle : { ...unselectedStyle, borderRadius: 999 }}>
                        {s}
                      </button>
                    )
                  })}
                  <button type="button"
                    onClick={() => setShowOtherService(v => !v)}
                    className="px-4 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                    style={showOtherService ? selectedStyle : { ...unselectedStyle, borderRadius: 999 }}>
                    Otro
                  </button>
                </div>
                {showOtherService && (
                  <input type="text" placeholder="Escríbelo (separa con comas si son varios)"
                    className={inputClass} style={inputStyle}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const extras = (e.target as HTMLInputElement).value.split(',').map(x => x.trim()).filter(Boolean)
                        setDraft(d => ({ ...d, services: [...new Set([...d.services, ...extras])] }))
                        ;(e.target as HTMLInputElement).value = ''
                        setShowOtherService(false)
                      }
                    }} />
                )}
                {draft.services.length > 0 && (
                  <p className="text-xs text-cherry-dark opacity-60">{draft.services.length} elegidos</p>
                )}
              </motion.div>
            )}

            {/* Paso 3 — Servicio estrella */}
            {step === 3 && (
              <motion.div key="s3" {...anim} className="space-y-2">
                {draft.services.map(s => (
                  <Option key={s} label={s} selected={draft.star === s}
                    onClick={() => setDraft(d => ({ ...d, star: s }))} />
                ))}
              </motion.div>
            )}

            {/* Paso 4 — Lo que te define */}
            {step === 4 && (
              <motion.div key="s4" {...anim} className="space-y-2">
                {autoStarNote && (
                  <p className="text-xs text-cherry-dark opacity-70 mb-2">{autoStarNote}</p>
                )}
                {DIFF_OPTIONS.map(o => (
                  <div key={o.id}>
                    <Option label={o.label} selected={draft.diffChoice === o.id}
                      onClick={() => setDraft(d => ({ ...d, diffChoice: o.id }))} />
                    {o.id === 'otra' && draft.diffChoice === 'otra' && (
                      <input type="text" placeholder="Cuéntame en una frase"
                        value={draft.diffText}
                        onChange={e => setDraft(d => ({ ...d, diffText: e.target.value }))}
                        className={inputClass + ' mt-2'} style={inputStyle} autoFocus />
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Paso 5 — Prioridad + cámara */}
            {step === 5 && (
              <motion.div key="s5" {...anim} className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-cherry-dark mb-1">
                    Si BRÄVE pudiera ayudarte primero con UNA cosa, ¿cuál elegirías?
                  </p>
                  <p className="text-xs text-cherry-dark opacity-60 mb-3">
                    Trabajaremos también el resto. Esto solo nos ayuda a saber por dónde empezar.
                  </p>
                  <div className="space-y-2">
                    {PRIORITY_OPTIONS.map(o => (
                      <Option key={o.id} label={o.label} selected={draft.priority === o.id}
                        onClick={() => setDraft(d => ({ ...d, priority: o.id }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-cherry-dark mb-3">¿Cómo te sientes creando contenido?</p>
                  <div className="space-y-2">
                    {FACE_OPTIONS.map(o => (
                      <Option key={o.id} label={o.label} selected={draft.showsFace === o.id}
                        onClick={() => setDraft(d => ({ ...d, showsFace: o.id }))} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 rounded-[var(--radius-sm)] text-sm text-center bg-buttermilk text-cherry-dark">
              {error}
            </div>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between gap-3 mt-8">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => {
                setError('')
                // Con auto-skip de estrella, del paso 4 se vuelve al 2.
                const target = step === 4 && draft.services.length === 1 ? 2 : (step - 1) as 0 | 1 | 2 | 3 | 4 | 5
                setStep(target)
              }}
              className="px-5 py-3 rounded-[var(--radius-md)] text-sm font-medium text-cherry-dark disabled:opacity-40 cursor-pointer"
              style={{ background: 'var(--color-warm-gray)' }}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => {
                setError('')
                if (step === 1) {
                  if (needsFullName && draft.fullName.trim().length < 2) { setError('Escribe tu nombre para continuar.'); return }
                  if (draft.salonName.trim().length < 2) { setError('Escribe cómo se llama tu salón, tu marca o tú misma.'); return }
                  setStep(2)
                } else if (step === 2) goFromServices()
                else if (step === 3) goFromStar()
                else if (step === 4) goFromDiff()
                else if (step === 5) finish()
              }}
              className="px-6 py-3 rounded-[var(--radius-md)] text-sm font-semibold bg-cherry text-white cursor-pointer hover:opacity-90 transition-opacity"
            >
              {step === 5 ? 'Terminar' : 'Siguiente'}
            </button>
          </div>

          {step > 0 && step < 6 && (
            <p className="text-xs text-center text-cherry-dark opacity-50 mt-4">
              Paso {visibleSteps.indexOf(step) + 1} de {visibleSteps.length} · {stepName(step)}
            </p>
          )}
        </div>
      )}
    </Shell>
  )
}

// ── Layout común ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10 bg-warm-light">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-lg)] p-6 sm:p-8 bg-cream"
          style={{ border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-cherry-dark mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Option({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-all cursor-pointer hover:opacity-90"
      style={selected
        ? { background: 'var(--color-cherry)', color: 'white', border: '1.5px solid var(--color-cherry)' }
        : { background: 'var(--color-cream)', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }}
    >
      {label}
    </button>
  )
}

const inputClass = 'w-full px-4 py-3 rounded-[var(--radius-md)] text-sm outline-none'

const anim = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

/** Estrategia mínima para demo (sin IA) — misma shape que Mi Marca espera. */
function mockStrategy(payload: Record<string, unknown>, stored: Record<string, unknown>): Record<string, unknown> {
  const salon = (payload.salon_name as string) || 'Tu salón'
  const star = (payload.service_to_promote as string) || (payload.main_services as string[])?.[0] || 'tu servicio'
  return {
    perfil_brave: `${salon} es un negocio cercano y profesional donde ${star} es el gran protagonista.`,
    resumen_ejecutivo: 'Estrategia generada en modo demo a partir de tu onboarding. En producción, esta la redacta la IA con tu ficha completa.',
    clienta_ideal: {
      descripcion: 'Persona que cuida su imagen y busca resultados de calidad.',
      edad: '30-45',
      problemas: ['No sabe a quién acudir', 'Miedo a que le dañe el pelo'],
      deseos: ['Resultados naturales', 'Que le recomienden bien'],
      objeciones: ['El precio', 'No tengo tiempo'],
    },
    servicios: (payload.main_services as string[] || []).map((s, i) => ({
      name: s, priority: i === 0 ? 'alta' : 'media', reason: i === 0 ? 'Es tu servicio estrella' : 'Complementa tu oferta',
    })),
    objetivos: [
      { timeframe: '1 mes', goal: 'Publicar con constancia', action: 'Deja que BRÄVE te planifique la semana' },
      { timeframe: '3 meses', goal: 'Más visibilidad', action: 'Publica transformaciones de ' + star },
      { timeframe: '6 meses', goal: 'Agenda llena de ' + star, action: 'Recoge testimonios y repite lo que funciona' },
    ],
    estrategia_contenido: [
      { type: 'Transformaciones', percentage: 30, reason: 'Tu estrella se vende mostrando resultados' },
      { type: 'Reels educativos', percentage: 25, reason: 'Autoridad' },
      { type: 'Carruseles', percentage: 20, reason: 'Guardados' },
      { type: 'Stories interactivas', percentage: 15, reason: 'Cercanía' },
      { type: 'Contenido personal', percentage: 10, reason: 'Confianza' },
    ],
    pilares_contenido: [
      { name: 'Transformaciones', description: 'Antes/después de tu servicio estrella', examples: [star] },
      { name: 'Educación', description: 'Consejos rápidos', examples: ['Cómo cuidar tu color'] },
    ],
    estilo_comunicacion: { tono: 'Cercano y profesional', voz: 'Tú misma', ejemplos: ['Hoy te enseño…', '¿Sabías que…?'] },
    imagen_personal: { descripcion: 'Muestra tu trabajo y tu proceso', consejos: ['Buena luz', 'Manos cuidadas'] },
    recomendaciones_visuales: ['Luz natural', 'Fondo limpio', 'Antes y después', 'Primer plano del resultado'],
    errores_detectados: ['Publicar sin plan', 'No mostrar resultados'],
    plan_accion: [{ text: 'Publica tu primera transformación', done: false }],
    resumen_para_ia: `${salon} prioriza ${(payload.main_priority as string) || 'crecer'}. Servicio estrella: ${star}. ${stored.optimized_summary || ''}`,
    strategy_generated_at: new Date().toISOString(),
  }
}