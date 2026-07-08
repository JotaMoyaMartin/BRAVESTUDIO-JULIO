'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { IS_DEMO } from '@/lib/demo'
import { Currency, Plan, getPriceId } from '@/lib/stripe-prices'
import SupportButton from '@/components/SupportButton'

function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const plan = searchParams.get('plan') as Plan | null
  const currency = (searchParams.get('currency') as Currency | null) || 'eur'

  const symbol = currency === 'eur' ? '€' : '$'

  const planLabel = plan === 'monthly'
    ? `Mensual 29 ${symbol}/mes`
    : plan === 'yearly'
      ? `Anual 199 ${symbol}/año`
      : null

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (fullName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    // Demo mode: simular signup sin Supabase real
    if (IS_DEMO) {
      router.push('/onboarding')
      router.refresh()
      return
    }

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName.trim(), plan: plan || undefined, currency: currency || undefined },
      },
    })
    if (authError) {
      setError(authError.message || 'No se pudo crear la cuenta.')
      setLoading(false)
      return
    }

    // Si Supabase requiere confirmación por email
    if (data.user && !data.session) {
      setInfo('Te hemos enviado un email de confirmación. Ábrelo y haz clic en el enlace para continuar.')
      setLoading(false)
      return
    }

    // Sin confirmación requerida → actualizar perfil y redirigir
    if (data.user && data.session) {
      // Update profile full_name
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', data.user.id)

      // If plan is set, redirect to Stripe checkout
      if (plan && currency) {
        const priceId = getPriceId(plan, currency)
        if (!priceId) {
          // No Stripe configured → go to onboarding
          router.push('/onboarding')
          router.refresh()
          return
        }
        try {
          const res = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, currency }),
          })
          const checkoutData = await res.json()
          if (checkoutData.url) {
            window.location.href = checkoutData.url
            return
          }
        } catch {
          // If checkout fails, fall back to onboarding
        }
      }
    }

    router.push('/onboarding')
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
              Crea tu cuenta y empieza a generar contenido estratégico para tu salón
            </p>
          </div>

          {planLabel && (
            <div
              className="mb-4 p-3 rounded-xl text-sm text-center font-medium"
              style={{ background: '#FFF1B5', color: '#591427', border: '1.5px solid rgba(122,24,50,0.15)' }}
            >
              Plan seleccionado: {planLabel}
            </div>
          )}

          {error && (
            <div className="mb-4 space-y-2">
              <div
                className="p-3 rounded-xl text-sm text-center"
                style={{ background: '#FFF1B5', color: '#591427' }}
              >
                {error}
              </div>
              <SupportButton variant="compact" subject="Problema creando cuenta en BRÄVE Studio" />
            </div>
          )}

          {info && (
            <div
              className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ background: '#e8f5e9', color: '#2a8a4a' }}
            >
              {info}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Nombre
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
                onFocus={e => (e.target.style.borderColor = '#7A1832')}
                onBlur={e => (e.target.style.borderColor = 'rgba(122,24,50,0.2)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Repite la contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="/login"
              className="text-xs hover:underline underline-offset-2"
              style={{ color: '#7A1832', opacity: 0.55 }}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}