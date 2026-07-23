'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/team/auth-context'
import { Eye, EyeOff } from 'lucide-react'

export default function TeamLoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loadingBtn, setLoadingBtn] = useState(false)

  // If already logged in as team, redirect to /team
  useEffect(() => {
    if (user && !loading) router.replace('/team')
  }, [user, loading, router])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingBtn(true)
    const ok = login(email, password)
    setLoadingBtn(false)
    if (ok) router.replace('/team')
    else setError('Email o contraseña incorrectos.')
  }

  const quick = (em: string) => {
    setEmail(em)
    setPassword('brave2026')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <div className="hidden md:flex flex-col justify-between w-[44%] bg-[#1a1a1a] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 70% 20%, #7A1832, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-[#7A1832] flex items-center justify-center font-bold">B</div>
            <div>
              <div className="font-bold text-lg leading-tight">BRÄVE</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Equipo · Content Studio</div>
            </div>
          </div>
          <h1 className="text-[34px] leading-tight font-bold mb-4">
            El estudio de contenido<br />para salones de belleza.
          </h1>
          <p className="text-white/70 text-[15px] max-w-md">
            Acceso restringido al equipo BRÄVE CONTENT. Dashboard semanal, planificación colaborativa, tareas y producción.
          </p>
        </div>
        <div className="relative text-white/40 text-[12px]">
          Acceso restringido · Solo personal autorizado
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center bg-[#FFFDF5] px-6">
        <div className="w-full max-w-[360px]">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-[#7A1832] flex items-center justify-center text-white font-bold">B</div>
            <span className="font-bold text-lg text-[#1a1a1a]">BRÄVE</span>
          </div>

          <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-1">Acceso equipo</h2>
          <p className="text-[13px] text-[#8a8680] mb-6">Inicia sesión para entrar al panel del equipo</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#3d3d3d] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="nombre@bravecontent.com"
                className="w-full px-3.5 py-2.5 text-[14px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] focus:ring-2 focus:ring-[#7A1832]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#3d3d3d] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-[14px] rounded-lg border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832] focus:ring-2 focus:ring-[#7A1832]/10 transition-all"
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8680] hover:text-[#1a1a1a]">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[12.5px] text-[#e03131] bg-[#FFF5F5] border border-[#ffd0d0] px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingBtn}
              className="w-full bg-[#7A1832] hover:bg-[#591427] text-white font-semibold text-[14px] py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loadingBtn ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#e8e6e3]">
            <div className="text-[11px] uppercase tracking-wider text-[#8a8680] mb-2.5">Acceso rápido (demo)</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { e: 'jota@bravecontent.com', l: 'Jota · Admin' },
                { e: 'nahir@bravecontent.com', l: 'Nahir · CM' },
                { e: 'geraldine@bravecontent.com', l: 'Geraldine · CM' },
                { e: 'delfino@bravecontent.com', l: 'Delfino · Editor' },
                { e: 'tuani@bravecontent.com', l: 'Tuani · Diseño' },
              ].map(q => (
                <button
                  key={q.e}
                  onClick={() => quick(q.e)}
                  className="text-[11.5px] text-left px-2.5 py-2 rounded-md bg-white border border-[#e8e6e3] hover:border-[#7A1832]/40 text-[#3d3d3d] transition-colors"
                >
                  {q.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}