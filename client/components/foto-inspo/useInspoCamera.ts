'use client'
// Cámara de Foto Inspo estilo nativa: FOTO + VÍDEO, lentes adaptables
// (enumerateDevices — Android expone traseras múltiples, iPhone no lo hace
// y los chips se ocultan solos), zoom por constraint si el track lo permite
// o digital (pinch/wheel) en todos los demás, torch si hay, timeout de permiso
// 10s y grabación con el pipeline ya probado del Teleprompter. Ver
// ARCHITECTURE §5.6 (teleprompter) y §5.8 (foto-inspo).
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AUDIO_NATURAL,
  applyCanvasMirror,
  computeRecordSize,
  mimeToExtension,
  pickMimeType,
} from '@/components/teleprompter/useCameraRecorder'
import {
  clampZoom,
  listBackLenses,
  mapUiZoomToConstraint,
  PHOTO_JPEG_QUALITY,
  pinchToZoom,
  readStoredLens,
  readStoredQuality,
  readZoomRange,
  supportsCanvasCapture,
  TrackCapabilitiesZoom,
  uiZoomFromSettings,
  writeStoredLens,
  writeStoredQuality,
  zoomedCoverRect,
  zoomMaxFromRange,
  ZOOM_MAX,
  type InspoLens,
  type InspoQuality,
  type ZoomMode,
  type ZoomRange,
} from '@/lib/camera/camera'

export type Facing = 'user' | 'environment'
export type InspoMode = 'photo' | 'video'
export type InspoStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error'
export type InspoErrorKind = 'denied' | 'busy' | 'incompatible' | 'unknown'

/** Lo que sale de una captura (foto o vídeo) — el componente lo guarda/toasta. */
export interface InspoCaptureResult {
  kind: 'photo' | 'video'
  blob: Blob
  url: string
  mime: string
  ext: 'jpg' | 'mp4' | 'webm'
}

function errorKindFor(err: unknown): InspoErrorKind {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  if (name === 'NotFoundError') return 'incompatible'
  return 'unknown'
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach(t => t.stop())
}

/** ¿El elemento video sirve? (ready + frames reales entregados). */
function hasFrames(
  video: HTMLVideoElement | null,
): video is HTMLVideoElement & { videoWidth: number; videoHeight: number } {
  return !!video && !!video.videoWidth && !!video.videoHeight
}

/** Captura el error real de MediaRecorder — los catch silenciosos han
 *  escondido bugs antes (lección del QA del teleprompter). */
function logCaptureError(where: string, err: unknown): void {
  console.warn(`[foto-inspo] ${where}`, err)
}

export function useInspoCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  // ── refs: ciclo de vida del stream + lecturas imperativas del rAF ──
  const streamRef = useRef<MediaStream | null>(null)
  const modeRef = useRef<InspoMode>('photo')
  const facingRef = useRef<Facing>('environment')
  const qualityRef = useRef<InspoQuality>('hd')
  const zoomRef = useRef(1)
  const zoomModeRef = useRef<ZoomMode>('digital')
  const zoomMaxRef = useRef(ZOOM_MAX)
  const zoomRangeRef = useRef<ZoomRange | null>(null)
  const torchOnRef = useRef(false)
  const torchSupportedRef = useRef(false)
  const recordingRef = useRef(false)
  const switchingLensRef = useRef(false)
  const lensAutoTriedRef = useRef(false) // el auto-switch a la lente guardada: 1 sola vez
  const permissionTimeoutRef = useRef<number | null>(null)

  // ── canvas de grabación (patrón teleprompter: DOM-attached para Safari) ──
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const drawRafRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeUsedRef = useRef<string | null>(null)

  // ── estado observable (espejo de los refs para la UI) ──
  const [status, setStatus] = useState<InspoStatus>('idle')
  const [errorKind, setErrorKind] = useState<InspoErrorKind | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [mode, setModeState] = useState<InspoMode>('photo')
  const [recording, setRecording] = useState(false)
  const [quality, setQualityState] = useState<InspoQuality>('hd')
  const [lenses, setLenses] = useState<InspoLens[]>([])
  const [activeLensId, setActiveLensId] = useState<string | null>(null)
  const [switchingLens, setSwitchingLens] = useState(false)
  const [zoom, setZoomState] = useState(1)
  const [zoomMode, setZoomMode] = useState<ZoomMode>('digital')
  const [zoomMax, setZoomMaxState] = useState(ZOOM_MAX)
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // Preferencia de calidad inicial (SSR-safe: post-mount).
  useEffect(() => {
    const stored = readStoredQuality()
    setQualityState(stored)
    qualityRef.current = stored
  }, [])

  useEffect(() => {
    switchingLensRef.current = switchingLens
  }, [switchingLens])
  useEffect(() => {
    zoomMaxRef.current = zoomMax
    zoomRangeRef.current = zoomRange
  }, [zoomMax, zoomRange])
  useEffect(() => {
    torchOnRef.current = torchOn
    torchSupportedRef.current = torchSupported
  }, [torchOn, torchSupported])

  /** Capabilities del track actual → zoom por constraint o digital + torch. */
  function deriveCapabilities(track: MediaStreamTrack | undefined): void {
    try {
      const caps = (track?.getCapabilities?.() ?? undefined) as TrackCapabilitiesZoom | undefined
      const range = readZoomRange(caps)
      if (range) {
        const settings = (track?.getSettings?.() ?? undefined) as (MediaTrackSettings & { zoom?: number }) | undefined
        const ui = uiZoomFromSettings(settings?.zoom, range)
        zoomModeRef.current = 'constraint'
        zoomRangeRef.current = range
        zoomMaxRef.current = zoomMaxFromRange(range)
        zoomRef.current = ui ?? 1
        setZoomMode('constraint')
        setZoomRange(range)
        setZoomMaxState(zoomMaxFromRange(range))
        setZoomState(ui ?? 1)
      } else {
        zoomModeRef.current = 'digital'
        zoomRangeRef.current = null
        zoomMaxRef.current = ZOOM_MAX
        zoomRef.current = 1
        setZoomMode('digital')
        setZoomRange(null)
        setZoomMaxState(ZOOM_MAX)
        setZoomState(1)
      }
      torchSupportedRef.current = caps?.torch === true
      setTorchSupported(caps?.torch === true)
    } catch (err) {
      logCaptureError('capabilities', err)
      zoomModeRef.current = 'digital'
      zoomRangeRef.current = null
      zoomMaxRef.current = ZOOM_MAX
      zoomRef.current = 1
      setZoomMode('digital')
      setZoomRange(null)
      setZoomMaxState(ZOOM_MAX)
      setZoomState(1)
      setTorchSupported(false)
    }
  }

  /** Enumera traseras con labels reales (SOLO con permiso concedido). */
  async function enumerateLenses(options: { facing: Facing; mode: InspoMode }): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const list = listBackLenses(devices)
      setLenses(list)
      const settings = streamRef.current?.getVideoTracks()[0]?.getSettings?.()
      const stored = readStoredLens()
      if (
        options.facing === 'environment' &&
        !lensAutoTriedRef.current &&
        stored &&
        list.some(l => l.id === stored) &&
        stored !== settings?.deviceId
      ) {
        lensAutoTriedRef.current = true
        await openCamera({ facing: 'environment', mode: options.mode, lensId: stored, autoLens: true })
      }
    } catch (err) {
      logCaptureError('enumerate', err)
      setLenses([])
    }
  }

  // ── abrir cámara: ladder (mismas reglas del teleprompter) ──
  const openCamera = useCallback(
    async (options: {
      facing: Facing
      mode: InspoMode
      lensId?: string | null
      autoLens?: boolean
    }): Promise<boolean> => {
      // iOS / regla universal de 1 stream: cerrar SIEMPRE el anterior antes.
      stopTracks(streamRef.current)
      streamRef.current = null
      setStream(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return false
      }
      setStatus('loading')
      setErrorKind(null)
      setTorchOn(false)
      const withAudio = options.mode === 'video'
      // La FOTO pide el ideal 9:16 portrait de hoy; el VÍDEO según calidad.
      const videoRes =
        options.mode === 'video'
          ? (qualityRef.current === 'uhd'
              ? { width: { ideal: 3840 }, height: { ideal: 2160 } }
              : { width: { ideal: 1920 }, height: { ideal: 1080 } })
          : { width: { ideal: 1080 }, height: { ideal: 1920 } }
      const attempts: MediaStreamConstraints[] = options.lensId
        ? [
            { video: { deviceId: { exact: options.lensId }, ...videoRes }, audio: withAudio ? AUDIO_NATURAL : false },
            { video: { facingMode: { exact: options.facing }, ...videoRes }, audio: withAudio ? AUDIO_NATURAL : false },
            { video: { facingMode: { ideal: options.facing }, ...videoRes }, audio: withAudio ? AUDIO_NATURAL : false },
          ]
        : [
            { video: { facingMode: { ideal: options.facing }, ...videoRes }, audio: withAudio ? AUDIO_NATURAL : false },
            { video: { facingMode: { ideal: options.facing } }, audio: withAudio ? AUDIO_NATURAL : false },
            { video: true, audio: withAudio },
          ]
      let opened: MediaStream | null = null
      // Timeout de permiso colgado (navegador in-app): fallback amable a los
      // 10s, como hoy. Cada intento lleva el suyo.
      for (let i = 0; i < attempts.length && !opened; i++) {
        try {
          opened = await Promise.race([
            navigator.mediaDevices.getUserMedia(attempts[i]),
            new Promise<never>((_, reject) => {
              permissionTimeoutRef.current = window.setTimeout(
                () => reject(new DOMException('permiso colgado', 'TimeoutError')),
                10000,
              )
            }),
          ])
        } catch (err) {
          const kind = errorKindFor(err)
          if (kind === 'denied' || kind === 'busy') {
            setErrorKind(kind)
            setStatus('error')
            return false
          }
          if (
            typeof err === 'object' &&
            err !== null &&
            'name' in err &&
            (err as { name?: string }).name === 'TimeoutError'
          ) {
            setStatus('unsupported')
            return false
          }
          // Overconstrained / cámara no disponible → siguiente intento
          opened = null
        } finally {
          if (permissionTimeoutRef.current !== null) {
            clearTimeout(permissionTimeoutRef.current)
            permissionTimeoutRef.current = null
          }
        }
      }
      if (!opened) {
        setErrorKind('incompatible')
        setStatus('error')
        return false
      }
      // Success: AHORA sí, anclar facing/mode (sin tocar refs en fallos).
      facingRef.current = options.facing
      modeRef.current = options.mode
      streamRef.current = opened
      setStream(opened)
      setStatus('ready')
      setFacing(options.facing)
      setModeState(options.mode)
      const track = opened.getVideoTracks()[0]
      const settings = track?.getSettings?.()
      // settings puede omitir deviceId (iOS/stream sin settings): con lensId
      // explícito ese ES el active; en primer open sin settings queda null.
      setActiveLensId(settings?.deviceId || options.lensId || null)
      if (options.lensId) {
        writeStoredLens(options.lensId)
        lensAutoTriedRef.current = true // un switch manual cuenta como intención
      }
      setZoomState(1)
      zoomRef.current = 1
      deriveCapabilities(track)
      // Tras el open (permiso concedido ⇒ labels reales): enumerar lentes y,
      // si hay lente guardada distinta, cambiarla 1 sola vez.
      if (!options.autoLens) {
        void enumerateLenses({ facing: options.facing, mode: options.mode })
      }
      return true
    },
    // Todas las dependencias son refs o setState (estables) — sin deps.
    [],
  )

  /** Cambiar de lente trasera. Si falla el deviceId exacto se restaura el
   *  stream anterior (patrón flipCamera del teleprompter); doble fallo → error. */
  async function chooseLens(lensId: string): Promise<void> {
    if (recordingRef.current || switchingLensRef.current) return
    if (facingRef.current !== 'environment') return
    setSwitchingLens(true)
    const constraintsFor = (video: MediaTrackConstraints): MediaStreamConstraints => ({
      video,
      audio: modeRef.current === 'video' ? AUDIO_NATURAL : false,
    })
    try {
      stopTracks(streamRef.current)
      streamRef.current = null
      const res =
        modeRef.current === 'video'
          ? (qualityRef.current === 'uhd'
              ? { width: { ideal: 3840 }, height: { ideal: 2160 } }
              : { width: { ideal: 1920 }, height: { ideal: 1080 } })
          : { width: { ideal: 1080 }, height: { ideal: 1920 } }
      const s = await navigator.mediaDevices.getUserMedia(constraintsFor({ deviceId: { exact: lensId }, ...res }))
      streamRef.current = s
      setStream(s)
      const track = s.getVideoTracks()[0]
      const deviceId = track?.getSettings?.().deviceId
      setActiveLensId(deviceId || lensId) // settings puede omitir deviceId: el chip elegido queda pressed igual
      writeStoredLens(deviceId || lensId)
      setZoomState(1)
      zoomRef.current = 1
      deriveCapabilities(track)
    } catch (err) {
      logCaptureError('chooseLens', err)
      // Restaurar la principal por facingMode (siempre responde). Doble
      // fallo aquí = cámara inservible → error screen del componente.
      try {
        const s = await navigator.mediaDevices.getUserMedia(
          constraintsFor({
            facingMode: { ideal: 'environment' },
            ...(modeRef.current === 'video'
              ? { width: { ideal: 1920 }, height: { ideal: 1080 } }
              : { width: { ideal: 1080 }, height: { ideal: 1920 } }),
          }),
        )
        streamRef.current = s
        setStream(s)
        deriveCapabilities(s.getVideoTracks()[0])
      } catch (err2) {
        logCaptureError('chooseLens-restore', err2)
        setErrorKind('incompatible')
        setStatus('error')
      }
    } finally {
      setSwitchingLens(false)
    }
  }

  /** Zoom de UI. Constraint → applyConstraints (degrada a digital si falla);
   *  digital → state + ref que el rAF de grabación lee por frame. */
  function setZoom(uiZoom: number): void {
    const target = clampZoom(uiZoom, zoomMaxRef.current)
    zoomRef.current = target
    setZoomState(target)
    if (zoomModeRef.current !== 'constraint') return
    const track = streamRef.current?.getVideoTracks()[0]
    const range = zoomRangeRef.current
    if (!track || !range || typeof track.applyConstraints !== 'function') return
    try {
      track
        .applyConstraints({ advanced: [{ zoom: mapUiZoomToConstraint(target, range) }] } as unknown as MediaTrackConstraints)
        .catch(err => {
          logCaptureError('applyConstraints(zoom)', err)
          downgradeToDigital()
        })
    } catch (err) {
      logCaptureError('applyConstraints(zoom-sync)', err)
      downgradeToDigital()
    }
  }

  function downgradeToDigital(): void {
    zoomModeRef.current = 'digital'
    zoomRangeRef.current = null
    zoomMaxRef.current = ZOOM_MAX
    setZoomMode('digital')
    setZoomRange(null)
    setZoomMaxState(ZOOM_MAX)
  }

  function resetZoom(): void {
    setZoom(1)
  }

  /** Chip de calidad (HD/4K): afecta a la SIGUIENTE grabación (como el
   *  teleprompter — el stream no se reabre, computeRecordSize decide). */
  function setQuality(q: InspoQuality): void {
    qualityRef.current = q
    writeStoredQuality(q)
    setQualityState(q)
  }

  /** Flash LED real (Android/Firefox). iOS nunca llega aquí (getCapabilities
   *  no declara torch → torchSupported false → chip oculto). */
  async function toggleTorch(): Promise<boolean> {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || !torchSupportedRef.current) return false
    const next = !torchOnRef.current
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints)
      const real = (track.getSettings?.() as (MediaTrackSettings & { torch?: boolean }) | undefined)?.torch
      const value = typeof real === 'boolean' ? real : next
      torchOnRef.current = value
      setTorchOn(value)
      return true
    } catch (err) {
      logCaptureError('torch', err)
      return false
    }
  }

  // ── FOTO: fotograma crudo → rect compuesto (zoom × 9:16) → JPEG ──
  // En modo constraint el track YA está físicamente en zoom → el rect usa
  // zoom 1 (no duplicar el zoom). En digital el rect compone el pinch.
  async function capturePhoto(): Promise<InspoCaptureResult | null> {
    const video = videoRef.current
    if (!hasFrames(video) || recordingRef.current) return null
    const vw = video.videoWidth
    const vh = video.videoHeight
    const rect =
      zoomModeRef.current === 'constraint'
        ? zoomedCoverRect(vw, vh, 1080, 1920, 1)
        : zoomedCoverRect(vw, vh, 1080, 1920, zoomRef.current)
    const w = Math.max(1, Math.round(rect.sw))
    const h = Math.max(1, Math.round(rect.sh))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.save()
    if (facingRef.current === 'user') applyCanvasMirror(ctx, w, h)
    ctx.drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h)
    ctx.restore()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY))
    if (!blob) return null
    return { kind: 'photo', blob, url: URL.createObjectURL(blob), mime: 'image/jpeg', ext: 'jpg' }
  }

  // ── VÍDEO: pipeline del teleprompter (canvas DOM + rAF + captureStream) ──
  function startRecording(): boolean {
    const video = videoRef.current
    if (!hasFrames(video) || recordingRef.current || modeRef.current !== 'video') return false
    if (typeof MediaRecorder === 'undefined' || !supportsCanvasCapture()) return false
    const { w, h } = computeRecordSize(video.videoWidth, video.videoHeight, qualityRef.current)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      // Safari solo entrega frames de un canvas compuesto en el DOM (2px).
      canvas.style.width = '2px'
      canvas.style.height = '2px'
      canvas.style.position = 'fixed'
      canvas.style.opacity = '0.01'
      document.body.appendChild(canvas)
      canvasElRef.current = canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d no disponible')
      const draw = () => {
        const v = videoRef.current
        if (!canvasElRef.current || !v || !v.videoWidth) return
        const rect =
          zoomModeRef.current === 'constraint'
            ? zoomedCoverRect(v.videoWidth, v.videoHeight, w, h, 1)
            : zoomedCoverRect(v.videoWidth, v.videoHeight, w, h, zoomRef.current)
        applyCanvasMirrorIfFront(ctx, w, h)
        ctx.drawImage(v, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h)
        drawRafRef.current = requestAnimationFrame(draw)
      }
      const canvasStream = canvas.captureStream(30)
      const audioTracks = streamRef.current?.getAudioTracks?.() ?? []
      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])
      const mime = pickMimeType()
      let recorder: MediaRecorder | null = null
      try {
        recorder = new MediaRecorder(combined, mime ? { mimeType: mime } : undefined)
      } catch {
        try {
          recorder = new MediaRecorder(combined)
        } catch {
          recorder = new MediaRecorder(streamRef.current ?? combined)
        }
      }
      if (!recorder) return false
      recorderRef.current = recorder
      chunksRef.current = []
      mimeUsedRef.current = null
      recorder.ondataavailable = ev => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onerror = () => {
        logCaptureError('recorder', 'MediaRecorder error interno')
      }
      const ext = mimeToExtension(mime)
      // MP4 en Safari: sin timeslice (trocear corrompe el archivo). WebM: 1s.
      if (ext === 'mp4') recorder.start()
      else recorder.start(1000)
      // iOS puede mentir con isTypeSupported: lo que cuenta es el mimeType real.
      mimeUsedRef.current = recorder.mimeType || mime
      recordingRef.current = true
      setRecording(true)
      drawRafRef.current = requestAnimationFrame(draw)
      return true
    } catch (err) {
      logCaptureError('startRecording', err)
      disposeRecordingCanvas()
      return false
    }
  }

  /** Espejo frontal: misma regla WYSIWYG que el teleprompter — el CSS
   *  scaleX(-1) del preview y el applyCanvasMirror del archivo. */
  function applyCanvasMirrorIfFront(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (facingRef.current === 'user') applyCanvasMirror(ctx, w, h)
  }

  function disposeRecordingCanvas(): void {
    if (drawRafRef.current !== null) {
      cancelAnimationFrame(drawRafRef.current)
      drawRafRef.current = null
    }
    canvasElRef.current?.remove()
    canvasElRef.current = null
  }

  async function stopRecording(): Promise<InspoCaptureResult | null> {
    const recorder = recorderRef.current
    recordingRef.current = false
    setRecording(false)
    try {
      await new Promise<void>(resolve => {
        if (!recorder || recorder.state === 'inactive') return resolve()
        recorder.onstop = () => resolve()
        try {
          recorder.stop()
        } catch (err) {
          logCaptureError('stop', err)
          resolve()
        }
      })
    } finally {
      disposeRecordingCanvas()
    }
    const type = mimeUsedRef.current || 'video/webm'
    const raw = chunksRef.current
    chunksRef.current = []
    if (raw.length === 0) return null
    const blob = new Blob(raw, { type })
    return { kind: 'video', blob, url: URL.createObjectURL(blob), mime: type, ext: mimeToExtension(type) }
  }

  /** Flip de cámara. Restauración ante fallo, como flipCamera del hook del
   *  teleprompter. Guard: nada de cambio de flujo mientras graba. */
  async function flipFacing(): Promise<boolean> {
    if (recordingRef.current) return false
    const prev = facingRef.current
    const next = prev === 'environment' ? 'user' : 'environment'
    const ok = await openCamera({ facing: next, mode: modeRef.current })
    if (ok) return true
    setStatus('loading')
    const restored = await openCamera({ facing: prev, mode: modeRef.current })
    if (!restored) setErrorKind('incompatible')
    return restored
  }

  /** foto→vídeo exige audio: reabre el stream con el ladder de vídeo. Si
   *  falla, intento vídeo sin audio; si también falla, quedamos en FOTO con
   *  el stream vivo. vídeo→photo no reabre nada (el audio queda idle). */
  async function setMode(next: InspoMode): Promise<boolean> {
    if (recordingRef.current) return false
    if (next === modeRef.current) return true
    if (next === 'video') {
      const ok = await openCamera({ facing: facingRef.current, mode: 'video' })
      if (ok) return true
      // Cámara sin micro disponible / audio rechazado: vídeo mudo es VÍDEO.
      return openVideoWithoutAudio()
    }
    modeRef.current = 'photo'
    setModeState('photo')
    return true
  }

  async function openVideoWithoutAudio(): Promise<boolean> {
    try {
      stopTracks(streamRef.current)
      streamRef.current = null
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingRef.current }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = s
      setStream(s)
      setStatus('ready')
      modeRef.current = 'video'
      setModeState('video')
      deriveCapabilities(s.getVideoTracks()[0])
      return true
    } catch (err) {
      logCaptureError('openVideoWithoutAudio', err)
      modeRef.current = 'photo'
      setModeState('photo')
      return false
    }
  }

  function closeCamera(): void {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {
        /* ya parado */
      }
    }
    disposeRecordingCanvas()
    recordingRef.current = false
    setRecording(false)
    stopTracks(streamRef.current)
    streamRef.current = null
    setStream(null)
    setStatus('idle')
    setLenses([])
    setActiveLensId(null)
    setTorchOn(false)
    torchOnRef.current = false
    setZoomState(1)
    zoomRef.current = 1
    lensAutoTriedRef.current = false
  }

  // Desmonte: parar stream si quedó abierto (el CameraView actual limpiaba
  // su facing-effect; ahora un solo unmount en el hook).
  useEffect(() => {
    return () => {
      stopTracks(streamRef.current)
      streamRef.current = null
    }
  }, [])

  // El pinch necesita el zoom por ref (handlers no re-renderizados mid-gesture).
  const getPinchHelpers = useCallback(
    () => ({
      applyPinch: (prevDist: number, nextDist: number) =>
        setZoom(pinchToZoom(prevDist, nextDist, zoomRef.current, zoomMaxRef.current)),
      getZoom: () => zoomRef.current,
    }),
    [],
  )

  return {
    // stream / status
    status,
    errorKind,
    stream,
    facing,
    mode,
    openCamera,
    closeCamera,
    flipFacing,
    setMode,

    // lentes
    lenses,
    activeLensId,
    switchingLens,
    chooseLens,
    /** Chips visibles solo con >1 trasera clasificable, en trasera y ready. */
    hasLensChips: lenses.length > 1 && facing === 'environment',

    // zoom
    zoomMode,
    zoom,
    zoomMax,
    zoomRange,
    setZoom,
    resetZoom,
    getPinchHelpers,

    // torch
    torchSupported,
    torchOn,
    toggleTorch,

    // captura
    quality,
    setQuality,
    capturePhoto,
    recording,
    startRecording,
    stopRecording,
  }
}