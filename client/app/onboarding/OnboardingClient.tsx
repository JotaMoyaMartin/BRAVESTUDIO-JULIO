'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { buildProfile, type ExtractedBrand } from '@/lib/brand-extract'
import VoiceButton from '@/components/VoiceButton'
import BraviMascot from '@/components/bravi/BraviMascot'

interface Props {
  profile?: Profile | null
  demoMode?: boolean
}

const GUIDE_BLOCKS = [
  {
    title: 'Sobre tu salón',
    questions: [
      '¿Cómo se llama tu salón?',
      '¿En qué ciudad estás?',
      '¿Trabajas sola o con equipo?',
    ],
  },
  {
    title: 'Servicios',
    questions: [
      '¿Qué servicios realizas?',
      '¿Cuáles son tus 3 servicios principales?',
      '¿Qué servicio quieres potenciar?',
    ],
  },
  {
    title: 'Clienta ideal',
    questions: [
      '¿Qué tipo de clienta quieres atraer?',
      '¿Qué problemas suele tener?',
      '¿Qué desea conseguir?',
    ],
  },
  {
    title: 'Contenido',
    questions: [
      '¿Qué dudas te hacen con frecuencia?',
      '¿Qué objetivo tienes ahora mismo?',
      '¿Qué te diferencia?',
    ],
  },
]

export default function OnboardingClient({ profile, demoMode }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [text, setText] = useState('')
  const [salonNameOverride, setSalonNameOverride] = useState('')
  const [fullName, setFullName] = useState('')
  const [askingSalon, setAskingSalon] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const needsFullName = !profile?.full_name

  async function handleSave(skip: boolean) {
    setError('')

    // If asking for salon name and user provided an override, use it
    if (askingSalon && !salonNameOverride.trim()) {
      setError('Escribe el nombre de tu salón para continuar.')
      return
    }

    setLoading(true)

    // Demo mode — skip everything, go to app
    if (demoMode) {
      router.push('/inicio')
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Determine salon name
    let salon = ''
    let extracted: ExtractedBrand | null = null

    if (skip) {
      salon = salonNameOverride.trim() || 'Mi salón'
    } else if (askingSalon) {
      // User filled the inline prompt; use override
      salon = salonNameOverride.trim()
    } else {
      extracted = buildProfile(text)
      salon = extracted.salon_name || ''
      if (!salon) {
        // Show inline salon prompt and wait
        setAskingSalon(true)
        setLoading(false)
        return
      }
    }

    // Determine full_name to save
    const finalFullName = profile?.full_name || fullName.trim() || 'Estilista'

    // Update profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        salon_name: salon,
        full_name: needsFullName ? finalFullName : undefined,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('No se pudo guardar. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    // Upsert brand_profiles (only if not skipping and there is text)
    if (!skip && text.trim().length > 0) {
      const brand = extracted ?? buildProfile(text)
      const completionStatus = (text.trim().length > 40 ? 'complete' : 'partial') as
        | 'complete'
        | 'partial'
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        const { error: brandError } = await supabase
          .from('brand_profiles')
          .update({
            raw_input: text,
            salon_name: salon,
            city: brand.city,
            main_services: brand.main_services,
            service_to_promote: brand.service_to_promote,
            content_topics: brand.content_topics,
            optimized_summary: brand.optimized_summary,
            completion_status: completionStatus,
            updated_at: now,
          })
          .eq('id', existing.id)
        if (brandError) {
          // Non-blocking — user can still enter the app
          console.warn('brand_profiles update failed:', brandError.message)
        }
      } else {
        const { error: brandError } = await supabase
          .from('brand_profiles')
          .insert({
            user_id: user.id,
            raw_input: text,
            salon_name: salon,
            city: brand.city,
            main_services: brand.main_services,
            service_to_promote: brand.service_to_promote,
            content_topics: brand.content_topics,
            optimized_summary: brand.optimized_summary,
            completion_status: completionStatus,
            updated_at: now,
          })
        if (brandError) {
          console.warn('brand_profiles insert failed:', brandError.message)
        }
      }
    }

    router.push('/inicio')
    router.refresh()
  }

  // ── Pantalla 1 — Welcome ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#FFF8E7' }}
      >
        <div className="w-full max-w-md text-center">
          <BraviMascot
            size={120}
            message="Vamos a configurar tu salón para que el contenido sea mucho más personalizado."
            showMessage
            className="mb-6"
          />

          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: '#591427' }}
          >
            Bienvenida a BRÄVE Studio
          </h1>
          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: '#591427', opacity: 0.8 }}
          >
            Soy Bravi, tu asistente de contenido. Antes de empezar, cuéntame un
            poco sobre ti.
          </p>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{
              background: '#7A1832',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Empezar
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla 2 — Mi Marca simplified ──────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 py-8"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <BraviMascot size={80} className="mb-3" />
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: '#591427' }}
          >
            Cuéntanos sobre tu salón
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: '#591427', opacity: 0.7 }}
          >
            Escribe libremente o usa el micrófono. Cuanto más cuentes, más
            personalizado será tu contenido.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-sm text-center"
            style={{ background: '#FFF1B5', color: '#591427' }}
          >
            {error}
          </div>
        )}

        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: 'white',
            border: '1.5px solid rgba(122,24,50,0.1)',
            boxShadow: '0 4px 24px rgba(89,20,39,0.07)',
          }}
        >
          {/* Legacy user without full_name — show required name input */}
          {needsFullName && (
            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#591427' }}
              >
                Tu nombre <span style={{ color: '#c0394e' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Marta García"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  border: '1.5px solid rgba(122,24,50,0.2)',
                  background: '#FFFDF5',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7A1832')}
                onBlur={(e) =>
                  (e.target.style.borderColor = 'rgba(122,24,50,0.2)')
                }
              />
            </div>
          )}

          {/* Big textarea */}
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#591427' }}
          >
            Cuéntanos sobre tu salón…
          </label>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe todo lo que quieras contar sobre tu salón. Puedes responder las preguntas de abajo en el orden que prefieras…"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y"
            style={{
              border: '1.5px solid #FFF1B5',
              background: '#FFFDF5',
              color: '#591427',
              lineHeight: 1.7,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7A1832')}
            onBlur={(e) => (e.target.style.borderColor = '#FFF1B5')}
          />

          {/* Voice button */}
          <div className="mt-3">
            <VoiceButton
              onTranscript={(t) => setText((prev) => (prev ? prev + ' ' + t : t))}
              label="Grabar voz"
            />
          </div>

          {/* Guide questions panel */}
          <div
            className="mt-5 rounded-2xl p-4 sm:p-5"
            style={{
              background: '#C1DBE8',
              border: '1.5px solid rgba(122,24,50,0.08)',
            }}
          >
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: '#591427' }}
            >
              Preguntas guía
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GUIDE_BLOCKS.map((block) => (
                <div key={block.title}>
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: '#591427', opacity: 0.7 }}
                  >
                    {block.title}
                  </p>
                  <ul className="space-y-1.5">
                    {block.questions.map((q) => (
                      <li
                        key={q}
                        className="text-xs leading-relaxed"
                        style={{ color: '#591427', opacity: 0.85 }}
                      >
                        • {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: '#7A1832',
                color: 'white',
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Guardando...' : 'Guardar y entrar'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(true)}
              className="px-5 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: 'transparent',
                color: '#591427',
                border: '1.5px solid rgba(122,24,50,0.2)',
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Saltar por ahora
            </button>
          </div>

          {/* Inline salon name prompt */}
          {askingSalon && (
            <div
              className="mt-4 p-4 rounded-2xl"
              style={{
                background: '#FFF1B5',
                border: '1.5px solid rgba(122,24,50,0.15)',
              }}
            >
              <p
                className="text-sm font-medium mb-2"
                style={{ color: '#591427' }}
              >
                No detectamos el nombre de tu salón. ¿Cómo se llama?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={salonNameOverride}
                  onChange={(e) => setSalonNameOverride(e.target.value)}
                  placeholder="Ej. Studio Brava"
                  autoFocus
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    border: '1.5px solid rgba(122,24,50,0.2)',
                    background: '#FFFDF5',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#7A1832')}
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'rgba(122,24,50,0.2)')
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(false)
                  }}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm"
                  style={{
                    background: '#7A1832',
                    color: 'white',
                    opacity: loading ? 0.65 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}