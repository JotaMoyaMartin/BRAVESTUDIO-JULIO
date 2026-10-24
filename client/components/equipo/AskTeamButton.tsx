'use client'
/**
 * «Pídeselo a tu equipo» (clientas del servicio, 24-oct-2026).
 * Solo aparece si la cuenta es de cliente del servicio. Manda la idea (un
 * guion, un reel viral, un gancho…) a su equipo BRÄVE, con una nota opcional.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Send, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { EquipoError, sendIdea } from '@/lib/equipo/client'

const RoleContext = createContext<string>('user')

export function RoleProvider({ role, children }: { role: string; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

/** ¿Es clienta del servicio de gestión de redes? */
export function useIsServiceClient(): boolean {
  return useContext(RoleContext) === 'premium'
}

export default function AskTeamButton({ titulo, texto, seccion, className, label = 'Pídeselo a tu equipo' }: {
  titulo: string
  texto?: string
  seccion: string
  className?: string
  label?: string
}) {
  const isClient = useIsServiceClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  if (!isClient) return null

  async function send() {
    setBusy(true)
    try {
      await sendIdea({ titulo: titulo.slice(0, 140), mensaje: nota.trim() || undefined, origen: { seccion, texto } })
      toast.show('¡Enviado a tu equipo! Lo verás en «Mi equipo BRÄVE».', 'success')
      setOpen(false); setNota('')
    } catch (e) {
      toast.show(e instanceof EquipoError ? e.message : 'No se ha podido enviar. Inténtalo de nuevo.', 'info')
    } finally { setBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? 'btn-secondary'}>
        <Send size={15} aria-hidden /> {label}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Pedir a tu equipo" onClick={() => !busy && setOpen(false)}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-cereza">Para tu equipo BRÄVE</p>
                <p className="text-[17px] font-semibold text-ink leading-snug">{titulo}</p>
              </div>
              <button onClick={() => setOpen(false)} disabled={busy} aria-label="Cerrar" className="text-tinta-2 hover:text-cereza"><X size={20} aria-hidden /></button>
            </div>
            <p className="text-[14px] text-tinta-2">Tu equipo lo prepara para tus redes. Si quieres, añade una nota.</p>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={3} placeholder="Me gustaría para la semana que viene, con mis fotos de balayage…" className="input-field resize-none text-[16px]" />
            <button onClick={send} disabled={busy} className="btn-primary w-full justify-center">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />} Enviar a mi equipo
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
