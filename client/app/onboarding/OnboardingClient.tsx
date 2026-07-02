'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import BraviMascot from '@/components/bravi/BraviMascot'

interface Props {
  profile?: Profile | null
  demoMode?: boolean
}

export default function OnboardingClient({ profile, demoMode }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [salonName, setSalonName] = useState(profile?.salon_name || '')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const needsFullName = !profile?.full_name

  async function handleEnter() {
    setError('')

    if (needsFullName && fullName.trim().length < 2) {
      setError('Escribe tu nombre para continuar.')
      return
    }

    setLoading(true)

    if (demoMode) {
      router.push('/inicio')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const salon = salonName.trim() || 'Mi salón'
    const finalFullName = profile?.full_name || fullName.trim() || 'Estilista'

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        salon_name: salon,
        ...(needsFullName ? { full_name: finalFullName } : {}),
      })
      .eq('id', user.id)

    if (updateError) {
      setError('No se pudo guardar. Inténtalo de nuevo.')
      setLoading(false)
      return
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
            message="¡Hola! Soy Bravi, tu asistente de contenido."
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
            En menos de 10 minutos crearás un mes entero de contenido para
            Instagram. ¡Empecemos!
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

  // ── Pantalla 2 — Solo nombre del salón ───────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 py-8"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <BraviMascot size={80} className="mb-3" />
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: '#591427' }}
          >
            Ya casi estamos
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: '#591427', opacity: 0.7 }}
          >
            Necesito el nombre de tu salón para personalizar tu contenido.
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

          <div className="mb-2">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: '#591427' }}
            >
              Nombre de tu salón
            </label>
            <input
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Ej. Studio Brava"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                border: '1.5px solid rgba(122,24,50,0.2)',
                background: '#FFFDF5',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEnter()
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7A1832')}
              onBlur={(e) =>
                (e.target.style.borderColor = 'rgba(122,24,50,0.2)')
              }
            />
          </div>

          <p
            className="text-xs mt-2 mb-5"
            style={{ color: '#591427', opacity: 0.55 }}
          >
            Podrás completar tu perfil de marca más tarde en{" "}
            <strong>Mi Marca</strong>, sin presión.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={handleEnter}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{
              background: '#7A1832',
              color: 'white',
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Guardando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}