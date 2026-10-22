'use client'
/** Mis fotos: el banco de imágenes de la estilista (en su cuenta). */
import { useEffect, useRef, useState } from 'react'
import { Cloud, Download, Loader2, Pencil, Smartphone, Trash2, Upload } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { deleteMyPhoto, listMyPhotos, photoSrc, saveMyPhoto, type MyPhoto } from '@/lib/estudio/my-photos'

export type ShownPhoto = MyPhoto & { url: string }

/** Lista de Mis fotos con una URL lista para pintar (se refresca con el evento «mis-fotos»). */
export function useMyPhotos() {
  const [photos, setPhotos] = useState<ShownPhoto[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let urls: string[] = []
    let vivo = true
    const load = () => listMyPhotos().then(list => {
      if (!vivo) return
      urls.forEach(u => URL.revokeObjectURL(u))
      const shown = list.map(p => ({ ...p, url: p.nube ? p.url! : URL.createObjectURL(p.blob!) }))
      urls = shown.filter(p => !p.nube).map(p => p.url)
      setPhotos(shown)
      setLoading(false)
    })
    load()
    window.addEventListener('mis-fotos', load)
    return () => { vivo = false; window.removeEventListener('mis-fotos', load); urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [])
  return { photos, loading }
}

async function descargar(p: ShownPhoto) {
  const blob: Blob = p.blob ? p.blob : await fetch(p.url).then(r => r.blob())
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brave-foto-${p.id}.jpg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Formato aproximado de una foto subida (para guardarla con su proporción). */
function aspectOf(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight
      URL.revokeObjectURL(img.src)
      resolve(r < 0.66 ? '9:16' : r < 0.9 ? '4:5' : r < 1.15 ? '1:1' : '16:9')
    }
    img.onerror = () => resolve('4:5')
    img.src = URL.createObjectURL(file)
  })
}

export default function MyPhotos({ onEdit }: { onEdit: (url: string) => void }) {
  const toast = useToast()
  const { photos, loading } = useMyPhotos()
  const [subiendo, setSubiendo] = useState(0)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const enMovil = photos.some(p => !p.nube)

  async function subir(files: FileList | null) {
    const lista = [...(files || [])].filter(f => f.type.startsWith('image/'))
    if (!lista.length) return
    setSubiendo(lista.length)
    for (const f of lista) {
      await saveMyPhoto(f, await aspectOf(f))
      setSubiendo(n => n - 1)
    }
    toast.show(lista.length === 1 ? 'Foto añadida a Mis fotos' : `${lista.length} fotos añadidas a Mis fotos`, 'success')
  }

  const subirBtn = (
    <>
      <button onClick={() => fileRef.current?.click()} disabled={subiendo > 0} className="btn-primary justify-center">
        {subiendo > 0 ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Upload size={16} aria-hidden />}
        {subiendo > 0 ? `Subiendo ${subiendo}…` : 'Añadir fotos a mi banco'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { void subir(e.target.files); e.currentTarget.value = '' }} />
    </>
  )

  if (loading) {
    return <div className="flex items-center gap-2 text-tinta-2 text-[15px] py-10 justify-center"><Loader2 size={18} className="animate-spin" aria-hidden /> Cargando tus fotos…</div>
  }
  if (!photos.length) {
    return (
      <div className="space-y-4">
        <EmptyState section="estudio" title="Tu banco de fotos está vacío" text="Sube tus fotos o guarda las que edites aquí. Quedan en tu cuenta y las eliges en Carruseles y Stories → Catálogo → Mis fotos." />
        <div className="flex justify-center">{subirBtn}</div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-[15px] text-tinta-2">
          <b className="text-burdeos">{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</b> en tu banco. Las eliges en Carruseles y Stories → Catálogo → Mis fotos.
        </p>
        {subirBtn}
      </div>
      {enMovil && (
        <p className="text-[13px] text-tinta-2 flex items-center gap-1.5"><Smartphone size={14} aria-hidden /> Las marcadas con el móvil solo están en este dispositivo: se subirán a tu cuenta al iniciar sesión.</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map(p => (
          <figure key={p.id} className="card overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />
              <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-burdeos flex items-center gap-1">
                {p.nube ? <Cloud size={12} aria-hidden /> : <Smartphone size={12} aria-hidden />}{p.aspect}
              </span>
            </div>
            <figcaption className="flex justify-between p-1.5">
              <button onClick={() => onEdit(photoSrc(p))} className="p-2 rounded-lg text-cherry-dark hover:bg-warm-gray" aria-label="Editar de nuevo"><Pencil size={16} /></button>
              <button onClick={() => void descargar(p)} className="p-2 rounded-lg text-cherry-dark hover:bg-warm-gray" aria-label="Descargar"><Download size={16} /></button>
              <button
                onClick={() => {
                  if (confirm('¿Borrar esta foto de tu banco? No se puede deshacer.')) {
                    deleteMyPhoto(p).catch(() => toast.show('No se pudo borrar. Inténtalo de nuevo.', 'info'))
                  }
                }}
                className="p-2 rounded-lg text-cherry-dark hover:bg-warm-gray" aria-label="Borrar"
              ><Trash2 size={16} /></button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
