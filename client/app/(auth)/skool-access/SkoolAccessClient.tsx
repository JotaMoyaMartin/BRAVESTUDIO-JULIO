'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'
import SupportButton from '@/components/SupportButton'

export default function SkoolAccessClient() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
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
    if (!code.trim()) {
      setError('Introduce tu código de acceso.')
      return
    }

    setLoading(true)

    // Demo mode
    if (IS_DEMO) {
      if (code.toUpperCase() === 'SKOOL') {
        router.push('/onboarding')
        router.refresh()
        return
      }
      setError('Este código no es válido o ha caducado.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message || 'No se pudo crear la cuenta.')
      setLoading(false)
      return
    }

    // Email confirmation required
    if (data.user && !data.session) {
      setInfo('Revisa tu email para confirmar tu cuenta, luego entra e introduce tu código en /access-blocked.')
      setLoading(false)
      return
    }

    // Session returned — update profile and redeem code
    if (data.user && data.session) {
      // Update profile full_name
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', data.user.id)

      // Redeem code
      try {
        const res = await fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.toUpperCase() }),
        })
        const redeemData = await res.json()
        if (res.ok && redeemData.ok) {
          router.push('/onboarding')
          router.refresh()
          return
        }
        setError('Este código no es válido o ha caducado.')
        setLoading(false)
      } catch {
        setError('Este código no es válido o ha caducado.')
        setLoading(false)
      }
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FFF8E7' }}
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#7A1832' }}
          >
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>
            Acceso para miembros BRÄVE
          </h1>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
        >
          <div className="flex flex-col items-center gap-3 mb-6 text-center">
            <span style={{ fontSize: 44 }}>🤖</span>
            <p className="text-sm leading-relaxed" style={{ color: '#591427', opacity: 0.8 }}>
              Si formas parte de la comunidad, crea tu cuenta con tu email e introduce tu código de acceso.
            </p>
          </div>

          {error && (
            <div className="mb-4 space-y-2">
              <div
                className="p-3 rounded-xl text-sm text-center"
                style={{ background: '#FFF1B5', color: '#591427' }}
              >
                {error}
              </div>
              <SupportButton variant="compact" subject="No pude crear cuenta Skool en BRÄVE Studio" />
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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#591427' }}>
                Código de acceso
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', letterSpacing: '0.05em' }}
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
              {loading ? 'Activando...' : 'Activar acceso gratuito'}
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