'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CameraOff, SwitchCamera, Play, Pause, Circle, Square, Download, Share2,
  Plus, Minus, X, RotateCcw, Copy, Check,
} from 'lucide-react'
import {
  TeleprompterInput,
  readTeleprompterInput,
  writeTeleprompterInput,
  buildNextSequenceInput,
  TELEPROMPTER_DRAFT_KEY,
  fileNameFor,
  clampFontSize,
  clampSpeed,
  speedToPxPerSecond,
  FONT_STEP,
  SPEED_STEP,
} from '@/lib/teleprompter/input'
import { useCameraRecorder, CAMERA_ERROR_MESSAGES } from './useCameraRecorder'

type Stage = 'editor' | 'setup' | 'ready' | 'countdown' | 'recording' | 'preview'

// Teleprompter V1 — una sola experiencia reutilizable (Home=dir / Crear=libertad:
// esto es CAPACIDAD, no herramienta nueva de edición). Solo graba bien: sin
// editor, filtros ni subtítulos. Móvil primero (iOS/Safari: MP4 + playsInline).
export default function TeleprompterClient() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cam = useCameraRecorder(videoRef)

  const [stage, setStage] = useState<Stage>('editor')
  const [input, setInput] = useState<TeleprompterInput | null>(null)
  const [script, setScript] = useState('')
  const [fontSize, setFontSize] = useState(26)
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [recorded, setRecorded] = useState<{ blob: Blob; url: string; mime: string } | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [pasted, setPasted] = useState(false)
  const [seconds, setSeconds] = useState(0)

  // --- Carga inicial: payload precargado (Reel/Stories) o borrador local ---
  useEffect(() => {
    const incoming = readTeleprompterInput()
    if (incoming) {
      setInput(incoming)
      setScript(incoming.script)
    } else {
      try {
        setScript(window.localStorage.getItem(TELEPROMPTER_DRAFT_KEY) || '')
      } catch {
        /* storage bloqueado: escribir a mano */
      }
    }
  }, [])

  // Borrador solo para entrada manual (los payloads precargados no se machacan).
  useEffect(() => {
    if (input) return
    try {
      window.localStorage.setItem(TELEPROMPTER_DRAFT_KEY, script)
    } catch {
      /* noop */
    }
  }, [script, input])

  useEffect(() => {
    return () => {
      if (recorded) URL.revokeObjectURL(recorded.url)
    }
  }, [recorded])

  // --- Scroll del texto (rAF sobre refs: cero re-renders por frame) ---
  const windowRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const endRef = useRef(0)

  const applyOffset = useCallback(() => {
    if (innerRef.current) innerRef.current.style.transform = `translateY(${offsetRef.current}px)`
  }, [])

  const resetScroll = useCallback(() => {
    const w = windowRef.current
    const i = innerRef.current
    if (!w || !i) return
    offsetRef.current = w.clientHeight * 0.75 // primera línea entra desde abajo del encuadre
    // Fin: la última línea queda visible en el tercio superior (no desaparece entera).
    endRef.current = w.clientHeight * 0.35 - i.scrollHeight
    applyOffset()
  }, [applyOffset])

  useEffect(() => {
    if (stage === 'ready') resetScroll()
  }, [stage, fontSize, script, resetScroll])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const v = speedToPxPerSecond(speed, fontSize)
    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      offsetRef.current -= v * dt
      if (offsetRef.current <= endRef.current) {
        offsetRef.current = endRef.current
        applyOffset()
        setPlaying(false)
        return
      }
      applyOffset()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, fontSize, applyOffset])

  // --- Flujo de grabación ---
  const startCountdown = useCallback(() => {
    setSavedMessage(null)
    setCountdown(3)
    setStage('countdown')
  }, [])

  const startRecordingFn = cam.startRecording
  useEffect(() => {
    if (stage !== 'countdown') return
    if (countdown <= 0) {
      const ok = startRecordingFn()
      if (ok) {
        resetScroll()
        setSeconds(0)
        setPlaying(true)
        setStage('recording')
      } else {
        setStage('ready')
      }
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, countdown, startRecordingFn, resetScroll])

  useEffect(() => {
    if (stage !== 'recording') return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [stage])

  const stopAndPreview = useCallback(async () => {
    setPlaying(false)
    const result = await cam.stopRecording()
    if (result) {
      setRecorded({ blob: result.blob, url: result.url, mime: result.mime })
      setStage('preview')
    } else {
      // Grabación vacía: repetir sin castigo.
      resetScroll()
      setStage('ready')
    }
  }, [cam, resetScroll])

  const repeat = useCallback(() => {
    if (recorded) URL.revokeObjectURL(recorded.url)
    setRecorded(null)
    setSavedMessage(null)
    resetScroll()
    setStage('ready')
  }, [recorded, resetScroll])

  const saveVideo = useCallback(async () => {
    if (!recorded) return
    const name = fileNameFor(input?.source, input?.sequence?.current ?? null, recorded.mime)
    const file = new File([recorded.blob], name, { type: recorded.mime || 'video/mp4' })
    try {
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
        setSavedMessage('Guardado. Búscalo en tus fotos o archivos.')
        return
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // cerró el panel: sin mensaje
    }
    // Fallback: descarga directa (Chrome/Android OK; iOS con gesto real guarda en Archivos).
    try {
      const a = document.createElement('a')
      a.href = recorded.url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setSavedMessage('Vídeo descargado. Si no aparece, guárdalo desde el reproductor.')
    } catch {
      window.open(recorded.url, '_blank')
      setSavedMessage('Abre el vídeo y guárdalo desde el menú compartir.')
    }
  }, [recorded, input])

  const continueAfterRecording = useCallback(() => {
    const next = input ? buildNextSequenceInput(input) : null
    if (next) {
      // Siguiente story de la secuencia: la cámara sigue viva, cero fricción.
      writeTeleprompterInput(next)
      setInput(next)
      setScript(next.script)
      if (recorded) URL.revokeObjectURL(recorded.url)
      setRecorded(null)
      setSavedMessage(null)
      setStage('ready')
      return
    }
    if (input?.returnUrl) {
      router.push(input.returnUrl)
      return
    }
    cam.closeCamera()
    setStage('editor')
  }, [input, recorded, router, cam])

  const exitRecording = useCallback(() => {
    cam.closeCamera()
    setPlaying(false)
    setStage('editor')
  }, [cam])

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) {
        setScript(text)
        setPasted(true)
        setTimeout(() => setPasted(false), 2000)
      }
    } catch {
      setSavedMessage('No se pudo leer el portapapeles. Mantén pulsado el campo y pega con el teclado.')
      setTimeout(() => setSavedMessage(null), 3500)
    }
  }, [])

  // --- Etiqueta del botón de continuar ---
  const nextInput = input ? buildNextSequenceInput(input) : null
  const continueLabel = nextInput
    ? `Continuar con ${nextInput.title ?? 'la siguiente'}`
    : input?.returnUrl
      ? 'Volver al contenido'
      : null

  const recorderOpen = stage === 'setup' || stage === 'ready' || stage === 'countdown' || stage === 'recording' || stage === 'preview'

  return (
    <>
      {/* ---------- Vista editor (entrada independiente / revisión previa) ---------- */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Circle size={12} style={{ color: 'var(--color-cherry)' }} fill="var(--color-cherry)" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-cherry opacity-60">Teleprompter</p>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>¿Qué quieres decir?</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-70">
            {input ? 'Tu guion está cargado. Revísalo y graba.' : 'Pega o escribe tu guion y graba hablando a cámara.'}
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-md)]" style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.1)' }}>
          {input?.title && (
            <p className="text-xs font-bold uppercase tracking-wider mb-3 text-cherry" style={{ opacity: 0.6 }}>{input.title}</p>
          )}
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={input ? '' : 'Pega o escribe tu guion...'}
            rows={input ? 8 : 10}
            className="w-full text-sm leading-relaxed outline-none resize-y"
            style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.15)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: '#1a1a1a' }}
          />
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={async () => {
                if (script.trim().length === 0) return
                cam.closeCamera()
                setStage('setup')
                const ok = await cam.openCamera('user')
                if (ok) setStage('ready')
              }}
              disabled={!script.trim()}
              className="btn-primary text-sm"
              style={{ opacity: !script.trim() ? 0.5 : 1 }}
            >
              <Play size={15} /> Empezar a grabar
            </button>
            {!input && (
              <button onClick={paste} className="btn-ghost text-sm">
                {pasted ? <Check size={14} /> : <Copy size={14} />} {pasted ? '¡Pegado!' : 'Pegar'}
              </button>
            )}
            {!input && script && (
              <button onClick={() => setScript('')} className="btn-ghost text-sm">
                <RotateCcw size={14} /> Borrar
              </button>
            )}
            {input?.returnUrl && (
              <button
                onClick={() => {
                  const url = input.returnUrl as string
                  router.push(url)
                }}
                className="btn-ghost text-sm"
              >
                <X size={14} /> Volver al contenido
              </button>
            )}
          </div>
          {!input && (
            <p className="mt-3 text-xs text-cherry-dark" style={{ opacity: 0.5 }}>
              Solo graba: sin editar el vídeo después. El borrador queda guardado en este dispositivo.
            </p>
          )}
          {savedMessage && stage === 'editor' && <p className="mt-3 text-xs text-cherry-dark">{savedMessage}</p>}
        </div>
      </div>

      {/* ---------- Grabador a pantalla completa ---------- */}
      {recorderOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Vídeo o preview */}
          {stage === 'preview' && recorded ? (
            <video src={recorded.url} controls autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Barra superior: salir + título */}
          {stage !== 'preview' && (
            <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 z-10">
              <button
                onClick={exitRecording}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-white/90 text-cherry-dark"
              >
                <X size={16} /> Salir
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-white/80 truncate max-w-[45%] text-right">
                {input?.title || 'Teleprompter'}
              </p>
            </div>
          )}

          {/* Texto superpuesto (arriba: mirada cerca de la cámara del móvil) */}
          {(stage === 'ready' || stage === 'countdown' || stage === 'recording') && (
            <div ref={windowRef} className="absolute inset-x-0 top-[14%] h-[40%] overflow-hidden px-5 z-10" style={{ pointerEvents: 'none' }}>
              <div
                ref={innerRef}
                className="mx-auto max-w-xl whitespace-pre-wrap text-center font-bold text-white will-change-transform"
                style={{ fontSize, lineHeight: 1.55, textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,1)' }}
              >
                {script}
              </div>
            </div>
          )}

          {/* Cuenta atrás */}
          {stage === 'countdown' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <p className="text-white text-8xl font-bold" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>{countdown}</p>
            </div>
          )}

          {/* Timer de grabación */}
          {stage === 'recording' && (
            <div className="absolute top-16 inset-x-0 z-10 flex justify-center">
              <p className="px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold tabular-nums">
                ● {formatSeconds(seconds)}
              </p>
            </div>
          )}

          {/* Error de permisos/cámara — mensajes sencillos, no técnicos */}
          {stage === 'setup' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 p-8 text-center bg-black/85">
              {cam.status === 'requesting' && !cam.errorKind && (
                <>
                  <p className="text-white text-lg font-semibold">Abriendo tu cámara…</p>
                  <p className="text-white/70 text-sm max-w-xs">Acepta el permiso para empezar.</p>
                </>
              )}
              {cam.errorKind && (
                <>
                  <CameraOff size={44} className="text-white/80" />
                  <p className="text-white text-lg font-semibold max-w-sm">{CAMERA_ERROR_MESSAGES[cam.errorKind]}</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={async () => {
                        const ok = await cam.openCamera('user')
                        if (ok) setStage('ready')
                      }}
                      className="btn-primary text-sm"
                    >
                      <RotateCcw size={14} /> Reintentar
                    </button>
                    <button onClick={exitRecording} className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold text-white" style={{ border: '1.5px solid rgba(255,255,255,0.35)' }}>
                      Volver
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Controles (ready): mínimos, abajo, nunca sobre el texto */}
          {stage === 'ready' && (
            <div className="absolute bottom-0 inset-x-0 z-10 pb-6 pt-10" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 60%)' }}>
              <div className="flex items-center justify-center gap-4 flex-wrap px-4">
                <ControlChip label="Texto" onMinus={() => setFontSize(f => clampFontSize(f - FONT_STEP))} onPlus={() => setFontSize(f => clampFontSize(f + FONT_STEP))} value={`${fontSize}px`} />
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
                  aria-label={playing ? 'Pausar texto' : 'Reproducir texto'}
                >
                  {playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <ControlChip label="Velocidad" onMinus={() => setSpeed(s => clampSpeed(s - SPEED_STEP))} onPlus={() => setSpeed(s => clampSpeed(s + SPEED_STEP))} value={`${speed.toFixed(2).replace(/\.?0+$/, '')}x`} />
                <button
                  onClick={cam.flipCamera}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
                  aria-label="Cambiar cámara"
                >
                  <SwitchCamera size={17} />
                </button>
              </div>
              <div className="flex justify-center mt-5">
                <button
                  onClick={startCountdown}
                  className="flex items-center justify-center w-16 h-16 rounded-full"
                  style={{ background: 'var(--color-cherry)', boxShadow: '0 6px 24px rgba(122,24,50,0.5)' }}
                  aria-label="Grabar"
                >
                  <Circle size={30} className="text-white" fill="white" />
                </button>
              </div>
            </div>
          )}

          {/* Detener (recording): un solo botón */}
          {stage === 'recording' && (
            <div className="absolute bottom-0 inset-x-0 z-10 pb-8 flex justify-center">
              <button
                onClick={stopAndPreview}
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{ background: 'var(--color-cherry)', boxShadow: '0 6px 24px rgba(122,24,50,0.5)' }}
                aria-label="Detener"
              >
                <Square size={26} className="text-white" fill="white" />
              </button>
            </div>
          )}

          {/* Preview: repetir / guardar / continuar */}
          {stage === 'preview' && recorded && (
            <div className="absolute bottom-0 inset-x-0 z-10 p-5 pb-8" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 45%)' }}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button onClick={repeat} className="px-5 py-3 rounded-[var(--radius-sm)] text-sm font-semibold text-white" style={{ border: '1.5px solid rgba(255,255,255,0.4)' }}>
                  <RotateCcw size={15} /> Repetir
                </button>
                <button
                  onClick={saveVideo}
                  className="btn-primary text-sm py-3"
                >
                  <Share2 size={15} /> Guardar vídeo
                </button>
                {continueLabel && (
                  <button onClick={continueAfterRecording} className="btn-secondary text-sm py-3">
                    {continueLabel} →
                  </button>
                )}
                {savedMessage && <p className="w-full text-center text-xs text-white/85 mt-1">{savedMessage}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function ControlChip({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onMinus}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
          aria-label={`Menos ${label.toLowerCase()}`}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={onPlus}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
          aria-label={`Más ${label.toLowerCase()}`}
        >
          <Plus size={14} />
        </button>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">{label} {value}</p>
    </div>
  )
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}