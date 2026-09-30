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

/** Rect fuente (dentro del vídeo) para rellenar targetW×targetH recortando al centro. */
export function coverCrop(
  vw: number,
  vh: number,
  targetW: number,
  targetH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const target = targetW / targetH
  let sw = vw
  let sh = vw / target
  if (sh > vh) {
    sh = vh
    sw = vh * target
  }
  return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh }
}

/** Resolución del vídeo guardado: 9:16 como lo ve Instagram/TikTok/Reels. */
const REC_WIDTH = 720
const REC_HEIGHT = 1280

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
  // Feed vertical: canvas 9:16 repintado por rAF (el vídeo guardado sale recortado
  // al centro, no el 4:3 crudo de la cámara).
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasStreamRef = useRef<MediaStream | null>(null)
  const drawRafRef = useRef(0)

  const stopCanvasFeed = useCallback(() => {
    cancelAnimationFrame(drawRafRef.current)
    drawRafRef.current = 0
    canvasStreamRef.current?.getTracks().forEach(t => t.stop())
    canvasStreamRef.current = null
    if (canvasRef.current && canvasRef.current.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current)
    }
    canvasRef.current = null
  }, [])

  function stopTracks() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    stopCanvasFeed()
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
    stopCanvasFeed() // feed anterior si lo hubiera
    let mime = pickMimeType()
    chunksRef.current = []

    // Formato vertical 9:16: la cámara nativa da 4:3; componemos cada frame
    // en un canvas 720×1280 (recorte al centro, lo mismo que se ve en pantalla,
    // object-cover) y grabamos ese feed con el audio del micro.
    let recordStream: MediaStream = stream
    let usingFeed = false
    const video = videoRef.current
    const canCapture =
      typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
    if (video && video.videoWidth > 0 && canCapture) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = REC_WIDTH
        canvas.height = REC_HEIGHT
        // Safari solo entrega frames de un canvas compuesto: lo montamos diminuto.
        canvas.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;'
        document.body.appendChild(canvas)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2d no disponible')
        const target = canvas.width / canvas.height
        const draw = () => {
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (vw > 0 && vh > 0) {
            const c = coverCrop(vw, vh, canvas.width, canvas.height)
            ctx.drawImage(video, c.sx, c.sy, c.sw, c.sh, 0, 0, canvas.width, canvas.height)
          }
          drawRafRef.current = requestAnimationFrame(draw)
        }
        draw()
        const canvasStream = canvas.captureStream(30)
        canvasStreamRef.current = canvasStream
        canvasRef.current = canvas
        recordStream = new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()])
        usingFeed = true
      } catch {
        stopCanvasFeed() // sin canvas: cámara directa, nunca rompe la grabación
      }
    }

    const tryRecorder = (s: MediaStream, m: string | null): MediaRecorder | null => {
      try {
        return m ? new MediaRecorder(s, { mimeType: m }) : new MediaRecorder(s)
      } catch {
        return null
      }
    }
    let recorder = tryRecorder(recordStream, mime)
    if (!recorder && usingFeed) {
      // El mime no tragó con el canvas (Chrome anuncia MP4 pero lo rechaza aquí):
      // verticales igualmente, dejando que el navegador elija códec.
      recorder = tryRecorder(recordStream, null)
    }
    if (!recorder && usingFeed) {
      // Algunos navegadores no aceptan el feed de canvas:
      // cámara directa tal cual, la grabación sigue existiendo.
      stopCanvasFeed()
      usingFeed = false
      recordStream = stream
      recorder = tryRecorder(recordStream, mime)
    }
    if (!recorder) {
      // Última carta: sin mimeType y que el navegador elija.
      mime = null
      recorder = tryRecorder(recordStream, null)
    }
    if (!recorder) {
      setErrorKind('record')
      return false
    }
    chunksRef.current = []
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onerror = () => setErrorKind('record')
    // Con MP4 (iOS) sin timeslice: Safari entrega todo al parar y sus trozos
    // parciales pueden romper el archivo. Con WebM sí, trozos por segundo.
    if (mime && mime.includes('mp4')) recorder.start()
    else recorder.start(1000)
    recorderRef.current = recorder
    setMimeType(recorder.mimeType || mime)
    setCanPause(typeof recorder.pause === 'function')
    setRecording(true)
    setPaused(false)
    return true
  }, [videoRef, stopCanvasFeed])

  /** Stream vivo de la cámara (para volver a proyectarlo tras el preview). */
  const getCameraStream = useCallback((): MediaStream | null => streamRef.current, [])

  /** Quita la proyección de cámara del <video> (el stream sigue vivo). */
  const hideCameraFeed = useCallback(() => {
    if (videoRef.current) videoRef.current.srcObject = null
  }, [videoRef])

  /** Reproyecta la cámara en el <video> (del preview se vuelve a grabar). */
  const showCameraFeed = useCallback(() => {
    const v = videoRef.current
    if (v && streamRef.current) {
      v.srcObject = streamRef.current
      v.muted = true
      v.play().catch(() => {})
    }
  }, [videoRef])

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
    stopCanvasFeed() // el feed vertical muere con la grabación
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
      stopCanvasFeed()
    }
  }, [stopCanvasFeed])

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
    getCameraStream,
    hideCameraFeed,
    showCameraFeed,
    closeCamera,
  }
}