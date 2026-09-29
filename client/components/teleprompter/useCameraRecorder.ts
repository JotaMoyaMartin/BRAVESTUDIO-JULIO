'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Cámara + grabación con APIs web estándar (getUserMedia + MediaRecorder).
// Sin librerías: V1 de Teleprompter. Móvil primero (iOS/Safari: solo MP4,
// 1 stream activo, requiere gesto de usuario; ver ARCHITECTURE §5.7).

export type CameraErrorKind =
  | 'unsupported' // navegador sin mediaDevices/MediaRecorder o contexto no seguro
  | 'denied' // permiso rechazado
  | 'notfound' // sin cámara disponible
  | 'busy' // cámara ocupada por otra app
  | 'incompatible' // OverconstrainedError u otro fallo de constraints
  | 'record' // MediaRecorder falló al arrancar
  | 'unknown'

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorKind, string> = {
  unsupported: 'Tu navegador no permite grabar. Prueba con Safari (iPhone) o Chrome (Android) actualizados.',
  denied: 'No diste permiso de cámara. Actívalo en los ajustes del navegador y vuelve a intentarlo.',
  notfound: 'No encontramos una cámara en este dispositivo.',
  busy: 'La cámara la está usando otra aplicación. Ciérrala e inténtalo de nuevo.',
  incompatible: 'No podemos abrir esta cámara. Inténtalo de nuevo.',
  record: 'No se pudo empezar a grabar. Inténtalo de nuevo.',
  unknown: 'Algo falló al abrir la cámara. Inténtalo de nuevo.',
}

// Preferencia: MP4 (Instagram + iOS lo reproducen siempre) → WebM.
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const t of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch {
      /* iOS ha mentido con isTypeSupported: el try/catch en start() cubre eso */
    }
  }
  return null // dejar que el navegador elija
}

export function mimeToExtension(mime: string | null | undefined): 'mp4' | 'webm' {
  return mime && mime.includes('mp4') ? 'mp4' : 'webm'
}

export interface RecordingResult {
  blob: Blob
  url: string
  mime: string
}

export type Facing = 'user' | 'environment'

export function useCameraRecorder(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [status, setStatus] = useState<'idle' | 'requesting' | 'live' | 'error'>('idle')
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null)
  const [facing, setFacing] = useState<Facing>('user')
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [canPause, setCanPause] = useState(false)
  const [mimeType, setMimeType] = useState<string | null>(null)

  function stopTracks() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function mapError(err: unknown): CameraErrorKind {
    const name = (err as { name?: string })?.name || ''
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'notfound'
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'busy'
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'incompatible'
    if (name === 'TypeError' || name === 'AbortError') return 'unsupported'
    return 'unknown'
  }

  const openCamera = useCallback(
    async (requestFacing: Facing): Promise<boolean> => {
      // Requisitos: APIs presentes y contexto seguro (HTTPS o localhost).
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setErrorKind('unsupported')
        setStatus('error')
        return false
      }
      setErrorKind(null)
      setStatus('requesting')
      // iOS: solo un stream getUserMedia activo — parar el anterior siempre.
      stopTracks()
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: requestFacing }, audio: true },
        { video: true, audio: true }, // fallback por si el facingMode exacto no existe
      ]
      let stream: MediaStream | null = null
      let lastKind: CameraErrorKind = 'unknown'
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch (err) {
          lastKind = mapError(err)
          if (lastKind === 'denied' || lastKind === 'busy') break // no reintentar con otro constraint
        }
      }
      if (!stream) {
        setErrorKind(lastKind)
        setStatus('error')
        return false
      }
      streamRef.current = stream
      setFacing(requestFacing)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        try {
          await video.play()
        } catch {
          /* autoplay bloqueado: el usuario ya está interactuando, se reanuda al pulsar */
        }
      }
      setStatus('live')
      return true
    },
    [videoRef],
  )

  /** Cambiar frontal ↔ trasera. Si la nueva falla, intenta restaurar la anterior. */
  const flipCamera = useCallback(async () => {
    const next: Facing = facing === 'user' ? 'environment' : 'user'
    const ok = await openCamera(next)
    if (!ok) await openCamera(facing)
  }, [facing, openCamera])

  const startRecording = useCallback((): boolean => {
    const stream = streamRef.current
    if (!stream || typeof MediaRecorder === 'undefined') {
      setErrorKind('unsupported')
      setStatus('error')
      return false
    }
    let mime = pickMimeType()
    chunksRef.current = []
    let recorder: MediaRecorder
    try {
      // Omitir mimeType (no pasar string vacío) si nada pasó isTypeSupported.
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch {
      try {
        mime = null
        recorder = new MediaRecorder(stream)
      } catch {
        setErrorKind('record')
        return false
      }
    }
    chunksRef.current = []
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onerror = () => setErrorKind('record')
    recorder.start() // sin timeslice: un blob al parar
    recorderRef.current = recorder
    setMimeType(recorder.mimeType || mime)
    setCanPause(typeof recorder.pause === 'function')
    setRecording(true)
    setPaused(false)
    return true
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    const recorder = recorderRef.current
    setPaused(false)
    if (!recorder || recorder.state === 'inactive') {
      setRecording(false)
      return null
    }
    const mime = recorder.mimeType || mimeType || ''
    const stopped = new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      try {
        recorder.stop()
      } catch {
        resolve()
      }
    })
    setRecording(false)
    recorderRef.current = null
    await stopped
    const blob = new Blob(chunksRef.current, { type: mime || 'video/mp4' })
    return blob.size > 0 ? { blob, url: URL.createObjectURL(blob), mime: mime || 'video/mp4' } : null
  }, [mimeType])

  /** Pausa grabación (descansa, recoloca el texto) y reanuda después: mismo vídeo. */
  const pauseRecording = useCallback((): boolean => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return false
    try {
      recorder.pause()
      setPaused(true)
      return true
    } catch {
      return false // navegador sin pausa real: la grabación sigue
    }
  }, [])

  const resumeRecording = useCallback((): boolean => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return false
    try {
      recorder.resume()
      setPaused(false)
      return true
    } catch {
      return false
    }
  }, [])

  const closeCamera = useCallback(() => {
    stopTracks()
    setStatus('idle')
    setRecording(false)
    setPaused(false)
  }, [])

  // Limpieza al desmontar.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  return {
    status,
    errorKind,
    facing,
    recording,
    paused,
    canPause,
    mimeType,
    openCamera,
    flipCamera,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    closeCamera,
  }
}