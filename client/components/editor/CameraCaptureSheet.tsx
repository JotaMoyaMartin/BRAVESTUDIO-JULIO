'use client'
// CameraCaptureSheet — pantalla completa photo-only sobre useInspoCamera
// (el hook de foto-inspo, SIN moverlo: shutter/flip/permiso ya resueltos ahí).
// El resultado InspoCaptureResult {kind:'photo', blob, url} lo consume el padre.

import { useEffect, useRef, useState } from 'react'
import { useInspoCamera } from '@/components/foto-inspo/useInspoCamera'
import { Camera, RefreshCw, X } from 'lucide-react'

interface CameraCaptureSheetProps {
  open: boolean
  onClose: () => void
  /** Captura lista (blob JPEG 9:16 + objectURL): el adopta el padre. */
  onCapture: (result: { blob: Blob; url: string }) => void
}

export default function CameraCaptureSheet({ open, onClose, onCapture }: CameraCaptureSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cam = useInspoCamera(videoRef)
  const [shooting, setShooting] = useState(false)

  useEffect(() => {
    if (!open) return
    cam.openCamera({ facing: 'environment', mode: 'photo' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (videoRef.current && cam.stream) videoRef.current.srcObject = cam.stream
  }, [cam.stream, cam.status])

  if (!open) return null

  function close() {
    cam.closeCamera()
    onClose()
  }

  async function shoot() {
    if (shooting) return
    setShooting(true)
    const result = await cam.capturePhoto()
    setShooting(false)
    if (!result || result.kind !== 'photo') return
    cam.closeCamera()
    onCapture({ blob: result.blob, url: result.url })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'black' }} role="dialog" aria-label="Cámara">
      {/* Preview del stream */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {cam.status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            {cam.status === 'loading' && <CameraSpin />}
            {cam.status === 'unsupported' && <CamText>La cámara no está disponible en este navegador.</CamText>}
            {cam.status === 'error' && (
              <CamText>
                {cam.errorKind === 'denied'
                  ? 'Permiso de cámara denegado — Actívalo en los ajustes del navegador.'
                  : cam.errorKind === 'busy'
                    ? 'La cámara está en uso por otra app o pestaña.'
                    : 'No encontramos una cámara disponible.'}
              </CamText>
            )}
          </div>
        )}
        {/* Cerrar */}
        <button onClick={close} aria-label="Cerrar cámara" className="absolute top-4 right-4 rounded-full p-2.5" style={{ background: 'rgba(10,6,8,0.5)' }}>
          <X size={18} color="#FFFFFF" />
        </button>
        {/* Flip (si hay stream vivo) */}
        {cam.status === 'ready' && (
          <button onClick={() => cam.flipFacing()} aria-label="Cambiar cámara" className="absolute top-4 left-4 rounded-full p-2.5" style={{ background: 'rgba(10,6,8,0.5)' }}>
            <RefreshCw size={16} color="#FFFFFF" />
          </button>
        )}
      </div>

      {/* Shutter estilo nativa (photo-only) */}
      <div className="flex items-center justify-center py-6" style={{ background: 'black' }}>
        {cam.status === 'ready' ? (
          <button
            onClick={() => void shoot()}
            disabled={shooting}
            aria-label="Hacer foto"
            className="rounded-full transition-transform active:scale-95"
            style={{ width: 72, height: 72, background: 'white', border: '5px solid rgba(255,255,255,0.35)' }}
          />
        ) : (
          <p className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Camera size={13} /> {cam.status === 'loading' ? 'Abriendo la cámara…' : 'Cámara no disponible'}
          </p>
        )}
      </div>
    </div>
  )
}

function CameraSpin() {
  return <div className="h-8 w-8 animate-spin rounded-full" style={{ border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'white' }} />
}

function CamText({ children }: { children: React.ReactNode }) {
  return <p className="mx-8 text-center text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{children}</p>
}