'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2, CheckCircle2, Copy } from 'lucide-react'
import { Profile } from '@/types/database'
import { hasActiveAccess } from '@/lib/access'
import Badge from '@/components/ui/Badge'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (user: Profile) => void
  isSuperAdmin: boolean
}

export default function CreateUserModal({ open, onClose, onCreated, isSuperAdmin }: Props) {
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [salon_name, setSalonName] = useState('')
  const [professional_role, setProfessionalRole] = useState('')
  const [role, setRole] = useState<'user' | 'admin' | 'superadmin'>('user')
  const [grantAccess, setGrantAccess] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ user: Profile } | null>(null)

  if (!open) return null

  function reset() {
    setFullName('')
    setEmail('')
    setPassword('')
    setCity('')
    setSalonName('')
    setProfessionalRole('')
    setRole('user')
    setGrantAccess(true)
    setError(null)
    setCreated(null)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: full_name.trim() || undefined,
          role: role !== 'user' ? role : undefined,
          grantAccess,
          city: city.trim() || undefined,
          salon_name: salon_name.trim() || undefined,
          professional_role: professional_role.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el usuario')
        return
      }
      if (data.user) {
        setCreated({ user: data.user as Profile })
      } else {
        setError(data.warning ?? 'Usuario creado pero no se pudo recuperar el perfil')
      }
    } catch {
      setError('Error de red al crear el usuario')
    } finally {
      setLoading(false)
    }
  }

  function confirmCreated() {
    if (created) {
      onCreated(created.user)
    }
    close()
  }

  function copyCreds() {
    if (!created) return
    const text = `BRÄVE Studio — Tus accesos

Email: ${created.user.email}
Contraseña: ${password}

Entra en: https://www.bravestudio.app/login

Cambie la contraseña cuando entres.`
    navigator.clipboard.writeText(text)
  }

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
  const labelClass = 'block text-xs font-semibold text-cherry-dark opacity-70 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,26,0.5)' }}
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-[var(--radius-md)] bg-cream shadow-strong max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-soft">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center bg-cherry">
              <UserPlus size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-cherry-dark">Crear nuevo usuario</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-warm-gray text-cherry-dark opacity-60">
            <X size={18} />
          </button>
        </div>

        {created ? (
          /* Vista de éxito */
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-semibold">Usuario creado correctamente</span>
            </div>

            <div className="rounded-[var(--radius-sm)] p-4 bg-warm-gray space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-60">
                Credenciales para enviar
              </div>
              <div className="text-sm text-cherry-dark">
                <div><span className="opacity-60">Nombre:</span> {created.user.full_name || '—'}</div>
                <div><span className="opacity-60">Email:</span> {created.user.email}</div>
                <div><span className="opacity-60">Contraseña:</span> {password}</div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={copyCreds}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-buttermilk text-cherry-dark hover:bg-[#ffe98a]"
                >
                  <Copy size={13} /> Copiar credenciales
                </button>
                {hasActiveAccess(created.user) ? (
                  <Badge tone="green">Acceso activo</Badge>
                ) : (
                  <Badge tone="danger">Sin acceso</Badge>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={close}
                className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-warm-gray text-cherry-dark hover:opacity-80"
              >
                Crear otro
              </button>
              <button
                onClick={confirmCreated}
                className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-cherry text-white hover:opacity-90"
              >
                Hecho
              </button>
            </div>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={submit} className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nombre completo</label>
                <input value={full_name} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Laura Pérez" />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className={inputClass} placeholder="laura@ejemplo.com" />
              </div>
              <div>
                <label className={labelClass}>Contraseña *</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="text" required minLength={6} className={inputClass} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input value={city} onChange={e => setCity(e.target.value)} className={inputClass} placeholder="Barcelona" />
              </div>
              <div>
                <label className={labelClass}>Nombre del salón</label>
                <input value={salon_name} onChange={e => setSalonName(e.target.value)} className={inputClass} placeholder="Salón Bräve" />
              </div>
              <div>
                <label className={labelClass}>Rol profesional</label>
                <input value={professional_role} onChange={e => setProfessionalRole(e.target.value)} className={inputClass} placeholder="Estilista" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-soft">
              <div>
                <label className={labelClass}>Rol en la plataforma</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as typeof role)}
                  className={inputClass}
                  disabled={!isSuperAdmin && role !== 'user'}
                >
                  <option value="user">Usuario</option>
                  {isSuperAdmin && <option value="admin">Admin</option>}
                  {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                </select>
                {!isSuperAdmin && <p className="text-[11px] text-cherry-dark opacity-50 mt-1">Solo superadmin puede crear admins.</p>}
              </div>

              <div>
                <label className={labelClass}>Acceso a la app</label>
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantAccess}
                    onChange={e => setGrantAccess(e.target.checked)}
                    className="w-4 h-4 accent-[#7A1832]"
                  />
                  <span className="text-sm text-cherry-dark">Conceder acceso activo (manual)</span>
                </label>
                <p className="text-[11px] text-cherry-dark opacity-50 mt-1">Si no, la usuaria podrá entrar pero no tendrá acceso hasta que lo actives.</p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-sm)] px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-warm-gray text-cherry-dark hover:opacity-80">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-cherry text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Crear usuario
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}