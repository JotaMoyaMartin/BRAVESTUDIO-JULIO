'use client'
// PhotoSourceBar — las 3 fuentes de foto de la app (subida, catálogo, cámara)
// en una sola fila de botones. Los sheets (StockPickerSheet / CameraCaptureSheet)
// viven aquí dentro: el consumidor solo recibe el SRC final de la foto elegida.
// Si el consumidor pasa onStabilize, las fotos de cámara/subida (blobs que
// mueren al recargar) se suben a Storage y la misma visual pasa a una URL
// firmada estable (24h) — el preview instantáneo con el blob nunca se interrumpe.

import { useRef, useState } from 'react'
import { Camera, Images, Trash2, Upload } from 'lucide-react'
import StockPickerSheet from './StockPickerSheet'
import CameraCaptureSheet from './CameraCaptureSheet'

interface PhotoSourceBarProps {
  hasPhoto: boolean
  /** src del item elegido (objectURL de cámara, ruta pública de catálogo, o de subida). */
  onPick: (src: string) => void
  onRemove: () => void
  /** Opcional: recibe la URL estable cuando la subida a Storage termina. */
  onStabilize?: (src: string) => void
  /** Campo para la subida (paths aislados y legibles en el bucket). */
  uploadField?: string
  /** Título del sheet de catálogo (contexto p.ej. "Foto del slide 2"). */
  stockTitle?: string
  labels?: { upload: string; remove: string }
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export default function PhotoSourceBar({ hasPhoto, onPick, onRemove, onStabilize, uploadField = 'foto', stockTitle, labels }: PhotoSourceBarProps) {
  const [stockOpen, setStockOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Sube el blob a Storage para que no muera al recargar (URL firmada 24h).
  // Fallo o sin sesión de diseño → silencio: la clienta conserva el blob tal como estaba.
  async function stabilize(blob: Blob, type: string, field: string) {
    if (!onStabilize) return
    const ext = EXT_BY_TYPE[type] ?? 'jpg'
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', blob, `foto.${ext}`)
      form.append('field', field)
      const res = await fetch('/api/design/photo', { method: 'POST', body: form })
      if (!res.ok) return
      const data = (await res.json()) as { ok?: boolean; signedUrl?: string }
      if (data.ok && data.signedUrl) onStabilize(data.signedUrl)
    } catch {
      /* blob queda */
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Upload */}
      <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm cursor-pointer">
        <Upload size={13} /> {hasPhoto ? labels?.upload || 'Cambiar foto' : 'Subir foto'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) {
            onPick(URL.createObjectURL(f))
            void stabilize(f, f.type, uploadField)
          }
          e.currentTarget.value = ''
        }}
      />

      {/* Catálogo */}
      <button onClick={() => setStockOpen(true)} className="btn-ghost text-sm">
        <Images size={13} /> Catálogo
      </button>

      {/* Cámara */}
      <button onClick={() => setCameraOpen(true)} className="btn-ghost text-sm">
        <Camera size={13} /> Hacer foto
      </button>

      {/* Quitar */}
      {hasPhoto && (
        <button onClick={onRemove} className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-cherry)', opacity: 0.7 }}>
          <Trash2 size={12} /> {labels?.remove || 'Quitar foto'}
        </button>
      )}

      {uploading && <p className="text-[10px] text-cherry-dark animate-pulse" style={{ opacity: 0.6 }}>Guardando foto…</p>}

      <StockPickerSheet open={stockOpen} onClose={() => setStockOpen(false)} onPick={src => { setStockOpen(false); onPick(src) }} title={stockTitle || 'Catálogo de fotos'} />
      <CameraCaptureSheet open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={r => { setCameraOpen(false); onPick(r.url); void stabilize(r.blob, r.blob.type, uploadField) }} />
    </div>
  )
}