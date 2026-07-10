'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { hasActiveAccess } from '@/lib/access'
import { IS_DEMO } from '@/lib/demo'
import SupportButton from '@/components/SupportButton'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Demo mode: simular login sin Supabase real
    if (IS_DEMO) {
      if (email === 'admin@bravestudio.com') {
        router.push('/admin')
      } else {
        router.push('/onboarding')
      }
      router.refresh()
      return
    }

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email o contraseña incorrectos. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, access_status, subscription_status, is_active, access_source, access_expires_at, full_name, salon_name')
        .eq('id', user.id)
        .single()

      // Admins van directo al panel — no necesitan onboarding ni acceso activo
      if (profile && (profile.role === 'superadmin' || profile.role === 'admin')) {
        router.push('/admin')
        router.refresh()
        return
      }

      // Premium va directo a inicio — sin onboarding ni access gate
      if (profile && profile.role === 'premium') {
        router.push('/inicio')
        router.refresh()
        return
      }

      // Si no ha completado onboarding → ir directo a onboarding (evita doble redirect)
      if (profile && (!profile.full_name || !profile.salon_name)) {
        router.push('/onboarding')
        return
      }

      if (!profile || !hasActiveAccess(profile)) {
        router.push('/access-blocked')
        return
      }
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#591427', letterSpacing: '-0.5px' }}>
            BRÄVE Studio
          </h1>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
        >
          <div className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="rounded-full flex items-center justify-center" style={{ width: 84, height: 84, background: 'rgba(255,241,181,0.8)' }}>
              <img src="/bravi2.png" alt="Bravi" className="bravi-float" style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(89,20,39,0.18))' }} draggable={false} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#591427', opacity: 0.8 }}>
              Acceso exclusivo para miembros activos de la comunidad BRÄVE
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <a
              href="/reset-password"
              className="block text-xs hover:underline underline-offset-2"
              style={{ color: '#7A1832', opacity: 0.45 }}
            >
              ¿Olvidaste tu contraseña?
            </a>
            <a
              href="/signup"
              className="block text-xs hover:underline underline-offset-2"
              style={{ color: '#7A1832', opacity: 0.55 }}
            >
              ¿No tienes cuenta? Crear cuenta
            </a>
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(122,24,50,0.1)' }}>
            <p className="text-xs mb-2 text-center" style={{ color: '#591427', opacity: 0.6 }}>
              ¿Tienes problemas para entrar?
            </p>
            <div className="flex justify-center">
              <SupportButton variant="inline" subject="Problema para entrar en BRÄVE Studio" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
