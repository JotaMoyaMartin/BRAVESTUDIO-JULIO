'use client'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CameraOff, SwitchCamera, Play, Pause, Circle, Square, Download, Share2,
  Plus, Minus, X, RotateCcw, Copy, Check, ChevronLeft, Film, Clapperboard, ChevronDown,
  FlipHorizontal2,
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
import { SavedScriptCard, selectSpeakableItems } from '@/lib/teleprompter/scripts'
import { IS_DEMO } from '@/lib/demo'
import { demoGetPlan } from '@/lib/demo-store'
import { useCameraRecorder, CAMERA_ERROR_MESSAGES, type RecordingQuality } from './useCameraRecorder'

type Stage = 'editor' | 'setup' | 'ready' | 'countdown' | 'recording' | 'preview'

// Teleprompter V1 — una sola experiencia reutilizable (Home=dir / Crear=libertad:
// esto es CAPACIDAD, no herramienta nueva de edición). Solo graba bien: sin
// editor, filtros ni subtítulos. Móvil primero (iOS/Safari: MP4 + playsInline).
export default function TeleprompterClient({ savedScripts = null }: { savedScripts?: SavedScriptCard[] | null }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cam = useCameraRecorder(videoRef)

  const [stage, setStage] = useState<Stage>('editor')
  const [input, setInput] = useState<TeleprompterInput | null>(null)
  const [script, setScript] = useState('')
  const [fontSize, setFontSize] = useState(26)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState<RecordingQuality>('hd')
  const [playing, setPlaying] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [recorded, setRecorded] = useState<{ blob: Blob; url: string; mime: string } | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [pasted, setPasted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [demoSaved, setDemoSaved] = useState<SavedScriptCard[]>([])
  // Tarjetas de "Mis guiones" desplegadas (leer el guion antes de decidir).
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Demo: los guiones guardados salen de demoGetPlan (misma fuente que Biblioteca).
  useEffect(() => {
    if (IS_DEMO) {
      setDemoSaved(selectSpeakableItems(demoGetPlan() as never))
    }
  }, [])
  const saved = savedScripts ?? demoSaved

  /** "Usar este guion": carga el guion y abre el teleprompter directamente. */
  const selectScript = useCallback(
    async (card: SavedScriptCard) => {
      setScript(card.text)
      setInput({
        script: card.text,
        title: card.title,
        source: card.kind === 'reel' ? 'reel' : 'stories',
        returnUrl: null,
        sequence: card.sequence ? { current: 0, total: card.sequence.length, items: card.sequence } : null,
      })
      setSavedMessage(null)
      // Misma entrada que "Empezar a grabar": a pantalla completa al instante.
      // Si la cámara falla, la propia pantalla pide permiso/reintenta (setup).
      cam.closeCamera()
      setStage('setup')
      const ok = await cam.openCamera('user')
      if (ok) setStage('ready')
    },
    [cam],
  )

  const goBack = useCallback(() => {
    if (input?.returnUrl) router.push(input.returnUrl)
    else router.back()
  }, [input, router])

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

  // Borrador siempre a salvo: si el usuario edita un guion precargado y navega
  // fuera sin grabar, el texto no se pierde (el muevo payload gana al cargar).
  useEffect(() => {
    try {
      window.localStorage.setItem(TELEPROMPTER_DRAFT_KEY, script)
    } catch {
      /* noop */
    }
  }, [script])

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
  const maxOffsetRef = useRef(0)
  // Arrastre para rebobinar: tocar y tirar del texto lo trae de vuelta.
  const draggingRef = useRef<{ pointerId: number; startY: number; startOffset: number } | null>(null)

  const applyOffset = useCallback(() => {
    if (innerRef.current) innerRef.current.style.transform = `translateY(${offsetRef.current}px)`
  }, [])

  const resetScroll = useCallback(() => {
    const w = windowRef.current
    const i = innerRef.current
    if (!w || !i) return
    offsetRef.current = w.clientHeight * 0.75 // primera línea entra desde abajo del encuadre
    maxOffsetRef.current = offsetRef.current
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
      // Mientras se arrastra el texto, el avance automático se congela.
      if (!draggingRef.current) {
        offsetRef.current -= v * dt
        if (offsetRef.current <= endRef.current) {
          offsetRef.current = endRef.current
          applyOffset()
          setPlaying(false)
          return
        }
        applyOffset()
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, fontSize, applyOffset])

  // --- Arrastrar el texto para repetir (funciona grabando y en pausa) ---
  const onTextPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = { pointerId: e.pointerId, startY: e.clientY, startOffset: offsetRef.current }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* sin captura: igual se puede arrastrar */
    }
  }, [])

  const onTextPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = draggingRef.current
      if (!d || d.pointerId !== e.pointerId) return
      const w = windowRef.current
      if (!w) return
      let next = d.startOffset + (e.clientY - d.startY)
      if (next > maxOffsetRef.current) next = maxOffsetRef.current
      else if (next < endRef.current) next = endRef.current
      offsetRef.current = next
      applyOffset()
    },
    [applyOffset],
  )

  const onTextPointerEnd = useCallback(() => {
    draggingRef.current = null
  }, [])

  // --- Flujo de grabación ---
  const startCountdown = useCallback(() => {
    setSavedMessage(null)
    setCountdown(3)
    setStage('countdown')
  }, [])

  const startRecordingFn = useCallback(() => cam.startRecording(quality), [cam, quality])
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
      // Detach la cámara del <video> ANTES del preview: si el stream sigue en
      // srcObject, en el mismo nodo tapa al src=blob (era la "cámara de nuevo").
      cam.hideCameraFeed()
      setRecorded({ blob: result.blob, url: result.url, mime: result.mime })
      setStage('preview')
    } else {
      // Grabación vacía: repetir sin castigo, pero aviso claro.
      setSavedMessage('La grabación salió vacía. Pulsa grabar para repetir.')
      resetScroll()
      setStage('ready')
    }
  }, [cam, resetScroll])

  const repeat = useCallback(() => {
    if (recorded) URL.revokeObjectURL(recorded.url)
    setRecorded(null)
    setSavedMessage(null)
    resetScroll()
    cam.showCameraFeed() // vuelve la proyección en vivo al <video>
    setStage('ready')
  }, [recorded, resetScroll, cam])

  /** Rebobina el texto al principio sin cortar la grabación. */
  const rewindToStart = useCallback(() => {
    resetScroll()
  }, [resetScroll])

  /** Guardado SIN hoja de compartir en ordenador/Android: descarga directa.
   *  Solo iOS usa navigator.share (ahí es la vía fiable a Fotos — un
   *  a[download] en Safari solo abre el visor). */
  const saveVideo = useCallback(async () => {
    if (!recorded) return
    const name = fileNameFor(input?.source, input?.sequence?.current ?? null, recorded.mime)
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    const file = new File([recorded.blob], name, { type: recorded.mime || 'video/mp4' })
    if (isIOS) {
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: name })
          setSavedMessage('Guardado. Búscalo en tus fotos o archivos.')
          return
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return // cerró el panel: sin mensaje
      }
    }
    // Descarga directa (Chrome/Android/escritorio: aparece nada más pulsar).
    try {
      const a = document.createElement('a')
      a.href = recorded.url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setSavedMessage('Vídeo guardado en tus descargas.')
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
      cam.showCameraFeed() // siguiente story: cámara de vuelta en el <video>
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
    setPlaying(false)
    if (cam.recording) {
      // Sale en plena grabación: cortamos el recorder (aunque sufra pausa) sin preview.
      cam.stopRecording().then(result => {
        if (result) URL.revokeObjectURL(result.url)
        cam.closeCamera()
      })
    } else {
      cam.closeCamera()
    }
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
  const isPreview = stage === 'preview'

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
            <button onClick={goBack} className="btn-ghost text-sm">
              <ChevronLeft size={14} /> Volver
            </button>
          </div>
          {!input && (
            <p className="mt-3 text-xs text-cherry-dark" style={{ opacity: 0.5 }}>
              Solo graba: sin editar el vídeo después. El borrador queda guardado en este dispositivo.
            </p>
          )}
          {savedMessage && stage === 'editor' && <p className="mt-3 text-xs text-cherry-dark">{savedMessage}</p>}
        </div>

        {/* ---------- Mis guiones: los mismos de Biblioteca (content_items) ---------- */}
        {saved.length > 0 && (
          <div className="rounded-[var(--radius-md)] p-5" style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.08)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clapperboard size={16} className="text-cherry" />
                <p className="font-bold text-sm text-cherry-dark">Mis guiones</p>
              </div>
              <Link
                href="/crear-contenido"
                className="inline-flex items-center gap-1 text-xs font-bold text-cherry hover:underline flex-shrink-0"
              >
                <Film size={13} /> Crear nuevo guion
              </Link>
            </div>
            <p className="text-xs text-cherry-dark mb-4" style={{ opacity: 0.6 }}>
              Guiones que ya tienes en BRÄVE, listos para grabar.
            </p>
            <div className="space-y-2.5">
              {saved.map(card => {
                const open = expandedCards.has(card.id)
                return (
                  <div
                    key={card.id}
                    className="rounded-[var(--radius-sm)]"
                    style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.08)' }}
                  >
                    {/* Cabeza clicable: despliega el guion completo para leerlo antes de usar */}
                    <button
                      onClick={() => toggleCard(card.id)}
                      className="w-full text-left p-3.5 flex items-start justify-between gap-3"
                      aria-expanded={open}
                      aria-label={`Ver guion completo: ${card.title}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-cherry-dark truncate">{card.title}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cherry mb-1" style={{ opacity: 0.5 }}>
                          {card.kindLabel} · {card.createdAt ? shortDate(card.createdAt) : 'guardado'}
                        </p>
                        <p
                          className="text-xs text-cherry-dark leading-snug whitespace-pre-line"
                          style={{
                            opacity: 0.65,
                            display: open ? 'block' : '-webkit-box',
                            WebkitLineClamp: open ? undefined : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: open ? 'auto' : 'hidden',
                            maxHeight: open ? 132 : undefined,
                          }}
                        >
                          {card.text}
                        </p>
                      </div>
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-cherry"
                        style={{ color: 'var(--color-cherry)', background: 'rgba(122,24,50,0.06)' }}
                      >
                        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      </span>
                    </button>
                    {open && (
                      <div className="px-3.5 pb-3.5">
                        <button
                          onClick={() => selectScript(card)}
                          className="btn-primary text-xs py-2 w-full"
                          aria-label={`Usar en Teleprompter: ${card.title}`}
                        >
                          <Play size={12} /> Usar este guion
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {saved.length === 0 && (
          <Link
            href="/crear-contenido"
            className="flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] text-sm font-semibold text-cherry-dark transition-all hover:scale-[1.01]"
            style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.08)' }}
          >
            <Film size={15} /> Crear un guion con BRÄVE
          </Link>
        )}
      </div>

      {/* ---------- Grabador a pantalla completa ---------- */}
      {recorderOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* UN solo <video> siempre montado: en preview juega el blob (la
              cámara ya se despegó con hideCameraFeed); en las demás fases,
              proyección en vivo. En preview SIN mute (se oye lo grabado) y con
              controles nativos visibles encima del hueco de acciones, así
              siempre se puede volver a reproducir. */}
          <video
            ref={videoRef}
            playsInline
            muted={!isPreview}
            autoPlay={isPreview}
            controls={isPreview}
            src={isPreview && recorded ? recorded.url : undefined}
            className={`w-full flex-1 min-h-0 ${isPreview ? 'object-contain' : 'object-cover'}`}
            style={{ transform: isPreview ? undefined : cam.mirror ? 'scaleX(-1)' : 'none' }}
          />

          {/* Barra superior: salir + título — siempre a la vista */}
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

          {/* Texto superpuesto (arriba: mirada cerca de la cámara del móvil).
              Interactivo en ready/recording: tirar del texto lo rebobina. */}
          {(stage === 'ready' || stage === 'countdown' || stage === 'recording') && (
            <div
              ref={windowRef}
              data-testid="teleprompter-text"
              className={`absolute inset-x-0 top-[14%] h-[40%] overflow-hidden px-5 z-10 ${stage === 'countdown' ? '' : 'touch-none select-none'}`}
              style={{ pointerEvents: stage === 'countdown' ? 'none' : 'auto' }}
              onPointerDown={stage === 'countdown' ? undefined : onTextPointerDown}
              onPointerMove={stage === 'countdown' ? undefined : onTextPointerMove}
              onPointerUp={stage === 'countdown' ? undefined : onTextPointerEnd}
              onPointerCancel={stage === 'countdown' ? undefined : onTextPointerEnd}
            >
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
              <p className="px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold tabular-nums flex items-center gap-1.5">
                <Circle size={10} fill="var(--color-cherry)" style={{ color: 'var(--color-cherry)' }} />
                {formatSeconds(seconds)}
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

          {/* Aviso (p. ej. grabación vacía) en la pantalla lista */}
          {stage === 'ready' && savedMessage && (
            <div className="absolute top-16 inset-x-0 z-10 flex justify-center px-6">
              <p className="px-3 py-1.5 rounded-full bg-white/90 text-cherry-dark text-xs font-semibold text-center">
                {savedMessage}
              </p>
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
                {/* Elige calidad tocando la opción, como en la cámara del iPhone */}
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Calidad</p>
                  <div
                    className="flex rounded-full"
                    style={{ background: 'rgba(255,255,255,0.14)', border: '1.5px solid rgba(255,255,255,0.4)', padding: 2 }}
                  >
                    <button
                      onClick={() => setQuality('hd')}
                      aria-pressed={quality === 'hd'}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: quality === 'hd' ? 'white' : 'transparent',
                        color: quality === 'hd' ? 'var(--color-ink)' : 'rgba(255,255,255,0.75)',
                      }}
                    >
                      HD
                    </button>
                    <button
                      onClick={() => setQuality('uhd')}
                      aria-pressed={quality === 'uhd'}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: quality === 'uhd' ? 'white' : 'transparent',
                        color: quality === 'uhd' ? 'var(--color-ink)' : 'rgba(255,255,255,0.75)',
                      }}
                    >
                      4K
                    </button>
                  </div>
                </div>
                {/* Espejo Sí/No: gobierna el preview Y el archivo (WYSIWYG).
                    Activo = blanco relleno, como la opción de calidad elegida. */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => cam.setMirror(m => !m)}
                    className="flex items-center justify-center w-11 h-11 rounded-full transition-all"
                    style={{
                      background: cam.mirror ? 'white' : 'rgba(255,255,255,0.18)',
                      border: '1.5px solid rgba(255,255,255,0.4)',
                      color: cam.mirror ? 'var(--color-ink)' : 'white',
                    }}
                    aria-pressed={cam.mirror}
                    aria-label="Efecto espejo"
                  >
                    <FlipHorizontal2 size={17} />
                  </button>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">Espejo</p>
                </div>
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

          {/* Grabación: texto/velocidad, rebobinar y detener — sin pausas,
              graba del tirón (la pausa nativa daba fallos al parar). */}
          {stage === 'recording' && (
            <div className="absolute bottom-0 inset-x-0 z-10 pb-6 pt-10 px-4" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 60%)' }}>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <ControlChip label="Texto" onMinus={() => setFontSize(f => clampFontSize(f - FONT_STEP))} onPlus={() => setFontSize(f => clampFontSize(f + FONT_STEP))} value={`${fontSize}px`} />
                <button
                  onClick={rewindToStart}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
                  aria-label="Volver el texto al principio"
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)' }}
                  aria-label={playing ? 'Pausar texto' : 'Reproducir texto'}
                >
                  {playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <ControlChip label="Velocidad" onMinus={() => setSpeed(s => clampSpeed(s - SPEED_STEP))} onPlus={() => setSpeed(s => clampSpeed(s + SPEED_STEP))} value={`${speed.toFixed(2).replace(/\.?0+$/, '')}x`} />
              </div>
              <div className="flex items-center justify-center gap-6 mt-5">
                <button
                  onClick={stopAndPreview}
                  className="flex items-center justify-center w-16 h-16 rounded-full"
                  style={{ background: 'var(--color-cherry)', boxShadow: '0 6px 24px rgba(122,24,50,0.5)' }}
                  aria-label="Detener y ver el vídeo"
                >
                  <Square size={26} className="text-white" fill="white" />
                </button>
              </div>
            </div>
          )}

          {/* Preview: repetir / guardar / continuar (flujo normal bajo el vídeo,
              nunca tapando los controles nativos de reproducción) */}
          {stage === 'preview' && recorded && (
            <div className="shrink-0 z-10 p-5 pb-8" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 20%)' }}>
              <p className="text-center text-[11px] text-white/70 mb-2">Míralo completo antes de guardarlo</p>
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

function shortDate(iso: string | null | undefined): string {
  if (!iso) return 'guardado'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'guardado'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}