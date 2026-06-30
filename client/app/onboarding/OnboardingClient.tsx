'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { IS_DEMO } from '@/lib/demo'

const ROLES = [
  'Estilista',
  'Colorista',
  'Barbero',
  'Maquilladora',
  'Peluquera',
  'Esteticista',
  'Otro',
]

interface Props {
  profile?: Profile | null
  demoMode?: boolean
}

export default function OnboardingClient({ profile, demoMode }: Props) {
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [salonName, setSalonName] = useState(profile?.salon_name || '')
  const [city, setCity] = useState(profile?.city || '')
  const [professionalRole, setProfessionalRole] = useState(profile?.professional_role || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !salonName.trim()) {
      setError('Tu nombre y el nombre del salón son obligatorios.')
      return
    }

    setError('')
    setLoading(true)

    if (demoMode) {
      router.push('/access')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        salon_name: salonName.trim(),
        city: city.trim() || null,
        professional_role: professionalRole || null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('No se pudo guardar. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    // Tras onboarding → a /access (para elegir plan o canjear código)
    router.push('/access')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>
            Bienvenida a BRÄVE Studio
          </h1>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
        >
          <div className="flex flex-col items-center gap-3 mb-6 text-center">
            <span style={{ fontSize: 40 }}>🤖</span>
            <p className="text-sm leading-relaxed" style={{ color: '#591427', opacity: 0.8 }}>
              Soy Bravi, tu asistente de contenido. Antes de empezar, cuéntame un poco sobre ti.
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

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Tu nombre <span style={{ color: '#c0394e' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej. Marta García"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Nombre del salón / estudio <span style={{ color: '#c0394e' }}>*</span>
              </label>
              <input
                type="text"
                value={salonName}
                onChange={e => setSalonName(e.target.value)}
                placeholder="Ej. Studio Brava"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Ej. Madrid"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Tu especialidad
              </label>
              <select
                value={professionalRole}
                onChange={e => setProfessionalRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', color: '#591427' }}
              >
                <option value="">Selecciona...</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
              style={{
                background: '#7A1832',
                color: 'white',
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Guardando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}