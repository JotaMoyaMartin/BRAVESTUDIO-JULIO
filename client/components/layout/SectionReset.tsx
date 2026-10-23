'use client'
/** Botón «Empezar de nuevo» arriba de cada sección con pasos (ver lib/section-reset.ts). */
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { RESETTABLE, keysToClear, resettableSection } from '@/lib/section-reset'

export default function SectionReset({ userId }: { userId: string }) {
  const pathname = usePathname()
  const section = resettableSection(pathname)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setConfirming(false) }, [pathname])
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  if (!section) return null

  function reset() {
    if (!confirming) { setConfirming(true); return }
    try {
      const all = Object.keys(localStorage)
      keysToClear(all, userId, section!).forEach(k => localStorage.removeItem(k))
    } catch { /* sin storage: basta con recargar */ }
    // Recarga completa: vuelve a la pantalla inicial de la sección, sin nada a medias.
    window.location.assign(`/${section}`)
  }

  return (
    <div className="mb-4 flex">
      <button onClick={reset}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${confirming ? 'bg-burdeos text-crema' : 'bg-white/70 border border-borde text-cherry-dark hover:border-cereza'}`}
        aria-label={confirming ? `Confirmar: empezar de nuevo en ${RESETTABLE[section].nombre}` : `Empezar de nuevo en ${RESETTABLE[section].nombre}`}>
        <RotateCcw size={14} aria-hidden />
        {confirming ? '¿Seguro? Toca otra vez (lo guardado no se borra)' : `Empezar de nuevo en ${RESETTABLE[section].nombre}`}
      </button>
    </div>
  )
}
