'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO } from '@/lib/demo'

function ResetForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Demo mode: simular envío
    if (IS_DEMO) {
      setSent(true)
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (resetError) {
      setError('No se pudo enviar el email. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          <h1 className="text-2xl font-bold" style={{ color: '#591427' }}>
            Recuperar contraseña
          </h1>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)', boxShadow: '0 4px 24px rgba(89,20,39,0.07)' }}
        >
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-3xl">📧</div>
              <p className="text-sm leading-relaxed" style={{ color: '#591427' }}>
                Te hemos enviado un email con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
              </p>
              <a
                href="/login"
                className="inline-block text-xs hover:underline underline-offset-2"
                style={{ color: '#7A1832', opacity: 0.55 }}
              >
                Volver a iniciar sesión
              </a>
            </div>
          ) : (
            <>
              <p className="text-sm mb-6 text-center" style={{ color: '#591427', opacity: 0.7 }}>
                Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.
              </p>

              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm text-center"
                  style={{ background: '#FFF1B5', color: '#591427' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
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
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <a
                  href="/login"
                  className="text-xs hover:underline underline-offset-2"
                  style={{ color: '#7A1832', opacity: 0.55 }}
                >
                  Volver a iniciar sesión
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}