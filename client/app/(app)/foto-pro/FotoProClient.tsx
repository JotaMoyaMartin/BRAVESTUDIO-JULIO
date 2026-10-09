'use client'
import { useRouter } from 'next/navigation'
import { Wand2, ScanFace, Lock } from 'lucide-react'
import BraviGuide from '@/components/bravi/BraviGuide'

/**
 * FOTO PRO — shell de la herramienta.
 * Dos sub-herramientas: RETOQUE PRO (disponible, MVP) y SESIÓN IA
 * (próximamente, no funcional aún — decisión de producto).
 */
export default function FotoProClient() {
  const router = useRouter()

  return (
    <div className="space-y-8 relative">
      <BraviGuide section="foto-pro" size={56} />

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">Foto Pro</h1>
        <p className="mt-2 text-sm text-ink opacity-75 max-w-xl">
          Mejora tus fotografías o crea imágenes profesionales con IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* RETOQUE PRO — disponible */}
        <button
          onClick={() => router.push('/foto-pro/retoque')}
          className="idea-card rounded-[var(--radius-lg)] p-6 text-left transition-transform hover:-translate-y-1"
          style={{
            background: 'var(--color-cream)',
            border: '1.5px solid var(--color-buttermilk)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[rgba(122,24,50,0.08)] flex items-center justify-center mb-4">
            <Wand2 size={24} className="text-cherry" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-bold text-cherry-dark text-lg">Retoque Pro</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[rgba(42,138,74,0.12)] text-[var(--color-success)]">
              Disponible
            </span>
          </div>
          <p className="text-sm text-ink opacity-75 leading-relaxed">
            Mejora fotografías reales sin perder identidad.
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cherry opacity-70">
            Usar Retoque Pro →
          </p>
        </button>

        {/* SESIÓN IA — próximamente (NO funcional aún) */}
        <div
          aria-disabled
          className="rounded-[var(--radius-lg)] p-6 relative select-none"
          style={{
            background: 'var(--color-warm-gray)',
            border: '1.5px dashed rgba(122,24,50,0.25)',
          }}
        >
          <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[rgba(122,24,50,0.06)] flex items-center justify-center mb-4">
            <ScanFace size={24} className="text-cherry opacity-50" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-bold text-cherry-dark text-lg opacity-80">Sesión IA</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[rgba(122,24,50,0.10)] text-cherry flex items-center gap-1">
              <Lock size={9} fill="currentColor" /> Próximamente
            </span>
          </div>
          <p className="text-sm text-ink opacity-75 leading-relaxed">
            Crea nuevas fotografías profesionales manteniendo tu identidad.
          </p>
          <p className="mt-4 text-xs text-cherry opacity-60">
            Estamos dándole los últimos toques ✦
          </p>
        </div>
      </div>
    </div>
  )
}