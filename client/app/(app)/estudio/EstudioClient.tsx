'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, Columns2, Images, Wand2, Sparkles } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import PhotoEditor from '@/components/estudio/PhotoEditor'
import BeforeAfter from '@/components/estudio/BeforeAfter'
import MyPhotos from '@/components/estudio/MyPhotos'
import FotoInspoClient from '../foto-inspo/FotoInspoClient'

type Paso = 'replica' | 'editala' | 'antes-despues' | 'mis-fotos'

const PASOS: Array<{ id: Paso; label: string; icon: React.ReactNode; hint: string }> = [
  { id: 'replica', label: 'Replica', icon: <Camera size={16} aria-hidden />, hint: 'Copia fotos que funcionan, con la cámara guiada' },
  { id: 'editala', label: 'Edítala', icon: <Wand2 size={16} aria-hidden />, hint: 'Luz, filtros, encuadre y fondo' },
  { id: 'antes-despues', label: 'Antes y después', icon: <Columns2 size={16} aria-hidden />, hint: 'Dos fotos juntas, mismo filtro' },
  { id: 'mis-fotos', label: 'Mis fotos', icon: <Images size={16} aria-hidden />, hint: 'Lo que has guardado' },
]

export default function EstudioClient() {
  const router = useRouter()
  const params = useSearchParams()
  // «hazla» era el nombre anterior de «replica»: los enlaces viejos siguen funcionando.
  const pedido = params.get('paso') === 'hazla' ? 'replica' : params.get('paso')
  const paso = (PASOS.find(p => p.id === pedido)?.id ?? 'editala') as Paso
  const [editSrc, setEditSrc] = useState<string | null>(null)

  const go = (p: Paso) => router.replace(`/estudio?paso=${p}`, { scroll: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudio de fotos"
        subtitle="Replica fotos que funcionan, déjalas bonitas y úsalas en tus carruseles y stories. Se guardan en tu cuenta."
      >
        <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Pasos del estudio">
          {PASOS.map(p => (
            <button key={p.id} role="tab" aria-selected={paso === p.id} onClick={() => go(p.id)}
              className={`flex-shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold border transition-colors ${paso === p.id ? 'bg-burdeos text-crema border-burdeos' : 'bg-white text-ink border-borde hover:border-cereza'}`}>
              {p.icon}{p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {paso === 'replica' && <FotoInspoClient embedded />}
      {paso === 'editala' && (
        <>
          <PhotoEditor initialSrc={editSrc} />
          <div className="rounded-2xl border border-dashed border-cereza/30 bg-white/60 p-4 flex gap-3 items-start">
            <Sparkles size={18} className="text-cereza flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-[14px] text-tinta-2"><b className="text-burdeos">Próximamente, con IA:</b> fondo de estudio realista, acabado de salón (brillo y sin frizz), luz profesional y probador de looks.</p>
          </div>
        </>
      )}
      {paso === 'antes-despues' && <BeforeAfter />}
      {paso === 'mis-fotos' && <MyPhotos onEdit={url => { setEditSrc(url); go('editala') }} />}
    </div>
  )
}
