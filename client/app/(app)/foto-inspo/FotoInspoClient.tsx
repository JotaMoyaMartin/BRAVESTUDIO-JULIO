'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera, ChevronLeft, X, SwitchCamera, Image as ImageIcon,
  Maximize2, Minimize2, ScanEye, Zap,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import BraviGuide from '@/components/bravi/BraviGuide'
import {
  FOTO_INSPO_CATEGORIES, FOTO_INSPO_ITEMS,
  FotoInspoCategoryId, FotoInspoItem,
} from '@/lib/foto-inspo'
import {
  isDoubleTap, isTouchDevice, pointerDistance,
} from '@/lib/camera/camera'
import {
  useInspoCamera,
  InspoCaptureResult,
  InspoMode,
} from '@/components/foto-inspo/useInspoCamera'
import { CAMERA_ERROR_MESSAGES } from '@/components/teleprompter/useCameraRecorder'

type Filter = FotoInspoCategoryId | null

/** Foto inspo — galería + cámara in-app ("Hacer esta foto"). MVP estático:
 *  sin favoritos ni BD; las portadas llegan después (cover: null → placeholder). */
export default function FotoInspoClient() {
  const [filter, setFilter] = useState<Filter>(null)
  const [activeItem, setActiveItem] = useState<FotoInspoItem | null>(null)

  const counts = new Map<FotoInspoCategoryId, number>()
  for (const it of FOTO_INSPO_ITEMS) counts.set(it.categoryId, (counts.get(it.categoryId) || 0) + 1)
  // Petición Jota (5-oct): las que YA tienen foto de referencia van arriba;
  // los placeholders "Foto por añadir", abajo. Orden estable por categoría.
  const base = !filter ? FOTO_INSPO_ITEMS : FOTO_INSPO_ITEMS.filter(it => it.categoryId === filter)
  const items = [...base.filter(it => it.cover), ...base.filter(it => !it.cover)]

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <BraviGuide section="foto-inspo" size={56} />
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">Foto inspo</h1>
          <p className="mt-2 text-sm text-ink opacity-75">
            Referencias para hacerte la foto perfecta — replica y dispara
          </p>
        </div>
      </div>

      {/* Chips de categoría (conteo) */}
      <div className="flex flex-wrap gap-2">
        <Chip label="Todas" count={FOTO_INSPO_ITEMS.length} active={filter === null} onClick={() => setFilter(null)} strong />
        {FOTO_INSPO_CATEGORIES.map(c => (
          <Chip
            key={c.id}
            label={c.name}
            blurb={c.blurb}
            count={counts.get(c.id) || 0}
            active={filter === c.id}
            onClick={() => setFilter(filter === c.id ? null : c.id)}
          />
        ))}
      </div>

      {/* Galería */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
        {items.map(item => (
          <InspoCard key={item.id} item={item} onOpen={() => setActiveItem(item)} />
        ))}
      </div>

      {/* Cámara in-app — pantalla completa */}
      <AnimatePresence>
        {activeItem && <CameraView item={activeItem} onBack={() => setActiveItem(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Chip de filtro ─────────────────────────────────────────────
function Chip({ label, blurb, count, active, onClick, strong }: {
  label: string
  blurb?: string
  count: number
  active: boolean
  onClick: () => void
  strong?: boolean // "Todas" — cherry-dark (patrón Inspiración Reels)
}) {
  return (
    <button
      onClick={onClick}
      title={blurb}
      className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
      style={
        active
          ? { background: strong ? 'var(--color-cherry-dark)' : 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-soft)' }
          : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }
      }
    >
      {label}
      <span
        className="px-1.5 rounded-full text-[10px]"
        style={active ? { background: 'rgba(255,255,255,0.25)' } : { background: 'var(--color-buttermilk)' }}
      >
        {count}
      </span>
    </button>
  )
}

// ─── Card de la galería (cover aspect-[4/5] + placeholder) ──────
function InspoCard({ item, onOpen }: { item: FotoInspoItem; onOpen: () => void }) {
  const cat = FOTO_INSPO_CATEGORIES.find(c => c.id === item.categoryId)!
  return (
    <button
      onClick={onOpen}
      className="idea-card rounded-[var(--radius-md)] overflow-hidden bg-white flex flex-col text-left transition-transform hover:-translate-y-0.5"
      style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'var(--color-warm-gray)' }}
          >
            <Camera size={38} className="text-cherry opacity-25" />
            <span className="text-[10px] font-semibold text-cherry opacity-50 text-center px-2">Foto por añadir</span>
          </div>
        )}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(0,0,0,0.45)', color: 'white', backdropFilter: 'blur(4px)' }}
        >
          {cat.name}
        </span>
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-sm text-cherry-dark" style={{ lineHeight: 1.35 }}>{item.title}</p>
        <p className="text-[11px] text-ink opacity-70" style={{ lineHeight: 1.4 }}>{item.tip}</p>
        <span className="text-xs text-cherry font-bold inline-flex items-center gap-1.5 mt-auto pt-2">
          <Camera size={12} /> Hacer esta foto
        </span>
      </div>
    </button>
  )
}

// ─── Cámara in-app ("Hacer esta foto") — estilo cámara nativa ───
// FOTO/VÍDEO + calidad HD/4K + lentes adaptables (0.5/1/2 si el móvil las
// expone; ocultas en iPhone donde Safari no las publica) + zoom pinch/wheel
// + LED si hay + flash de pantalla (siempre) + botón "Tu cámara" (touch) que
// abre la app Cámara real del móvil. Ver ARCHITECTURE §5.8.

// Esquinas del PIP, orden de ciclado con el tap: TL → TR → BR → BL.
const PIP_CORNERS: { cls: string; label: string }[] = [
  { cls: 'top-2 left-2', label: 'arriba-izquierda' },
  { cls: 'top-2 right-2', label: 'arriba-derecha' },
  { cls: 'bottom-2 right-2', label: 'abajo-derecha' },
  { cls: 'bottom-2 left-2', label: 'abajo-izquierda' },
]

const ZOOM_WHEEL_STEP = 0.25

function CameraView({ item, onBack }: { item: FotoInspoItem; onBack: () => void }) {
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cam = useInspoCamera(videoRef)

  const [flashing, setFlashing] = useState(false)
  const [pipCorner, setPipCorner] = useState(0)
  const [pipBig, setPipBig] = useState(false)
  const [pipHidden, setPipHidden] = useState(false)
  const [refOverlay, setRefOverlay] = useState(false)
  const [lastCapture, setLastCapture] = useState<InspoCaptureResult | null>(null)
  const [captureViewer, setCaptureViewer] = useState(false)
  const [recStartedAt, setRecStartedAt] = useState<number | null>(null)
  const [recSeconds, setRecSeconds] = useState(0)
  const [mounted, setMounted] = useState(false) // isTouchDevice es client-only

  const lastUrlRef = useRef<string | null>(null)
  const pinch = cam.getPinchHelpers()
  const showNativeCam = mounted && isTouchDevice()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // Abrir una sola vez: trasera + FOTO. Flips/modo/lente reabren por evento.
    cam.openCamera({ facing: 'environment', mode: 'photo' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Conectar el stream al <video> cuando ya está en el DOM (tras reopen).
  useEffect(() => {
    if (videoRef.current && cam.stream) videoRef.current.srcObject = cam.stream
  }, [cam.stream, cam.status])

  // Timer del contador de grabación (redondo a segundo).
  useEffect(() => {
    if (recStartedAt === null) {
      setRecSeconds(0)
      return
    }
    const t = setInterval(() => setRecSeconds(Math.floor((Date.now() - recStartedAt) / 1000)), 250)
    return () => clearInterval(t)
  }, [recStartedAt])

  // Zoom con rueda (desktop): listener nativo no-passivo para poder capturar
  // sin scrollear la pantalla detrás. En móvil manda el pinch.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e: WheelEvent) => {
      if (cam.status !== 'ready') return
      e.preventDefault()
      const dz = e.deltaY < 0 ? ZOOM_WHEEL_STEP : -ZOOM_WHEEL_STEP
      cam.setZoom(pinch.getZoom() + dz)
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.status])

  // El pill de zoom vive solo mientras el zoom no sea exactamente 1.
  const zoomPillVisible = cam.zoom > 1.001

  // ── guardar: en iPhone iOS no deja a la WEB escribir en Fotos (única vía de
  // Apple: el sheet de compartir → "Guardar imagen", 1 toque). En Android y
  // desktop: descarga directa sin pantallas.
  async function saveResult(result: InspoCaptureResult, baseName: string) {
    const name = `${baseName}.${result.ext}`
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      try {
        const file = new File([result.blob], name, { type: result.mime })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] })
          toast.show(
            result.kind === 'photo' ? 'Foto guardada — búscala en tus fotos' : 'Vídeo guardado — búscalo en tus fotos',
            'success',
          )
          return
        }
        // canShare false (in-app browsers raros) → caemos al download
      } catch (err) {
        // Cancelar la hoja no es un error: no duplicar el intento.
        if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError') return
        // sin abort → caemos al download
      }
    }
    try {
      const url = result.url
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      toast.show(
        result.kind === 'photo' ? 'Foto descargada — ya puedes subirla a Instagram' : 'Vídeo guardado en tus descargas',
        'success',
      )
    } catch (err) {
      console.warn('[foto-inspo] save', err)
      toast.show('No se pudo guardar — prueba otra vez', 'info')
    }
  }

  /** Adopta una captura: thumb + viewer + guardado (todo el flujo igual en
   *  foto, vídeo y "Tu cámara"). */
  function adoptCapture(result: InspoCaptureResult, baseName: string) {
    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current)
    lastUrlRef.current = result.url
    setLastCapture(result)
    void saveResult(result, baseName)
  }

  async function shootPhoto() {
    if (cam.status !== 'ready' || cam.recording) return
    setFlashing(true)
    const result = await cam.capturePhoto()
    setTimeout(() => setFlashing(false), 180)
    if (!result) {
      toast.show('No se pudo generar la foto — prueba otra vez', 'info')
      return
    }
    adoptCapture(result, `foto-inspo-${item.id}`)
  }

  async function toggleRecord() {
    if (cam.status !== 'ready') return
    if (cam.recording) {
      const result = await cam.stopRecording()
      setRecStartedAt(null)
      if (!result) {
        toast.show('No se grabó nada — prueba otra vez', 'info')
        return
      }
      adoptCapture(result, `foto-inspo-${item.id}`)
    } else {
      if (!cam.startRecording()) {
        toast.show('No se pudo empezar a grabar. Inténtalo de nuevo', 'info')
        return
      }
      setRecStartedAt(Date.now())
    }
  }

  async function switchMode(next: InspoMode) {
    if (next === cam.mode || cam.recording || cam.status === 'loading') return
    const ok = await cam.setMode(next)
    if (!ok) toast.show('No se pudo cambiar a VÍDEO — seguimos en FOTO', 'info')
  }

  async function onFlip() {
    if (cam.recording || cam.status === 'loading') return
    await cam.flipFacing()
  }

  async function onTorch() {
    const ok = await cam.toggleTorch()
    if (!ok) toast.show('El flash no está disponible ahora mismo', 'info')
  }

  async function handleBack() {
    if (cam.recording) {
      const r = await cam.stopRecording()
      if (r) URL.revokeObjectURL(r.url)
      setRecStartedAt(null)
    }
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current)
      lastUrlRef.current = null
    }
    cam.closeCamera()
    onBack()
  }

  function onNativeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir re-elegir el mismo archivo luego
    if (!file) return
    const result: InspoCaptureResult = {
      kind: 'photo',
      blob: file,
      url: URL.createObjectURL(file),
      mime: file.type || 'image/jpeg',
      ext: 'jpg',
    }
    adoptCapture(result, `foto-inspo-${item.id}-cam`)
  }

  // ── Pinch (2 punteros) + doble tap reset sobre el visor ──
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistRef = useRef(0)
  const lastTapRef = useRef(0)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchDistRef.current = pointerDistance(a, b)
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = pointerDistance(a, b)
      const prev = pinchDistRef.current
      if (prev > 0) pinch.applyPinch(prev, dist)
      pinchDistRef.current = dist
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const wasPinching = pointersRef.current.size >= 2
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchDistRef.current = 0
    // Doble tap en el área vacía del visor → volver a 1x (los taps sobre el
    // PIP u otros botones no cuentan: son su propio onClick).
    if (
      !wasPinching &&
      e.pointerType !== 'mouse' &&
      !(e.target instanceof HTMLElement && e.target.closest('button'))
    ) {
      const now = Date.now()
      if (isDoubleTap(now, lastTapRef.current)) {
        cam.resetZoom()
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    }
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchDistRef.current = 0
  }

  // ── Fallbacks: navegador in-app o cámara imposible (denegada, ocupada…) ──
  if (cam.status === 'unsupported' || cam.status === 'error') {
    const esUnsupported = cam.status === 'unsupported'
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: 'var(--color-ink)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <TopButton onClick={handleBack} ariaLabel="Volver a la galería">
            <ChevronLeft size={16} /> Volver
          </TopButton>
        </div>
        <div className="max-w-sm mx-auto px-4 pb-10 space-y-4 pt-4">
          <div className="relative mx-auto max-w-[280px] aspect-[4/5] rounded-[var(--radius-md)] overflow-hidden" style={{ border: '1.5px solid rgba(255,241,181,0.4)' }}>
            <RefCover item={item} big />
          </div>
          <div
            className="rounded-[var(--radius-md)] p-4 space-y-2"
            style={{ background: 'rgba(255,241,181,0.12)', border: '1.5px solid rgba(255,241,181,0.35)' }}
          >
            <p className="text-sm font-bold" style={{ color: 'var(--color-buttermilk)' }}>
              {esUnsupported ? 'La cámara no está disponible aquí' : 'No pudimos abrir la cámara'}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {esUnsupported
                ? <>Prueba abriendo BRÄVE en Safari o Chrome del móvil, o haz esta foto tú: {item.tip}</>
                : <>{CAMERA_ERROR_MESSAGES[cam.errorKind ?? 'unknown']} Y para captar la idea sin cámara: {item.tip}</>}
            </p>
          </div>
          {!esUnsupported && (
            <button
              onClick={() => { void cam.openCamera({ facing: cam.facing, mode: cam.mode }) }}
              className="block mx-auto px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: 'var(--color-buttermilk)', color: 'var(--color-ink)' }}
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  const capturingBlocked = cam.status !== 'ready'
  const videoTransform =
    cam.zoomMode === 'digital' && cam.zoom > 1
      ? `scale(${cam.zoom})${cam.facing === 'user' ? ' scaleX(-1)' : ''}`
      : cam.facing === 'user'
        ? 'scaleX(-1)'
        : undefined

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Barra superior */}
      <div className="flex items-center flex-shrink-0 gap-2 px-3 py-3">
        <TopButton onClick={handleBack} ariaLabel="Volver a la galería">
          <ChevronLeft size={16} /> Volver
        </TopButton>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-buttermilk)', opacity: 0.8 }}>Hacer esta foto</p>
          <p className="text-sm font-bold text-white truncate">{item.title}</p>
        </div>
        {/* Chip de calidad — solo en VÍDEO (la foto sale al máximo del stream) */}
        {cam.mode === 'video' && cam.status === 'ready' && (
          <div role="group" aria-label="Calidad del vídeo" className="flex flex-shrink-0 gap-1 rounded-[var(--radius-md)]" style={{ background: 'rgba(255,255,255,0.12)', padding: 2 }}>
            <SegmentChip label="HD" active={cam.quality === 'hd'} onClick={() => cam.setQuality('hd')} />
            <SegmentChip label="4K" active={cam.quality === 'uhd'} onClick={() => cam.setQuality('uhd')} />
          </div>
        )}
      </div>

      {/* Columna de cámara: centrada, flexible — el visor cede altura para que
          el shutter nunca quede bajo el fold (como la app Cámara). */}
      <div className="w-full max-w-sm mx-auto px-4 pt-1 pb-6 flex-1 min-h-0 flex flex-col">
        {/* Video live */}
        <div className="flex-1 min-h-0 grid place-items-center">
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDoubleClick={() => cam.resetZoom()}
          className="relative h-full max-h-[min(100%,calc(24rem*16/9))] aspect-[9/16] max-w-full rounded-[var(--radius-md)] overflow-hidden touch-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,241,181,0.4)' }}
        >
          {cam.status === 'ready' ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: videoTransform }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="inline-block w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-buttermilk)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Abriendo tu cámara...</p>
            </div>
          )}

          {/* Pill de grabación (top-center) */}
          {cam.mode === 'video' && cam.recording && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
              aria-live="polite"
            >
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2 h-2 rounded-full block flex-shrink-0"
                style={{ background: 'var(--color-cherry)' }}
              />
              {`${String(Math.floor(recSeconds / 60)).padStart(2, '0')}:${String(recSeconds % 60).padStart(2, '0')}`}
            </div>
          )}

          {/* Pill de zoom (visible ≠1x) */}
          {zoomPillVisible && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}>
              {cam.zoom.toFixed(1)}×
            </div>
          )}

          {/* Chips de lente (solo si el móvil expone varias traseras) */}
          {cam.status === 'ready' && cam.hasLensChips && (
            <div role="group" aria-label="Cambiar de lente" className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {cam.lenses.map(lens => (
                <button
                  key={lens.id}
                  onClick={() => cam.chooseLens(lens.id)}
                  disabled={cam.switchingLens || cam.recording}
                  aria-pressed={cam.activeLensId === lens.id}
                  aria-label={`Lente ${lens.factor === 0.5 ? '0,5' : lens.factor} (${lens.label})`}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-40"
                  style={
                    cam.activeLensId === lens.id
                      ? { background: 'white', color: 'var(--color-ink)' }
                      : { background: 'rgba(0,0,0,0.45)', color: 'var(--color-buttermilk)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,241,181,0.35)' }
                  }
                >
                  {lens.factor === 0.5 ? '0,5' : lens.factor}
                </button>
              ))}
            </div>
          )}

          {/* PIP de referencia (o recordatorio si aún no hay foto) */}
          {cam.status === 'ready' && item.cover && !pipHidden && (
            <div
              className={`absolute ${PIP_CORNERS[pipCorner].cls} ${pipBig ? 'w-48 md:w-56' : 'w-24 md:w-32'} z-30`}
            >
              <button
                onClick={() => setPipCorner(c => (c + 1) % PIP_CORNERS.length)}
                className="w-full aspect-[4/5] rounded-lg overflow-hidden block"
                style={{ border: '2px solid rgba(255,241,181,0.9)', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }}
                aria-label={`Mover la referencia de esquina (ahora ${PIP_CORNERS[pipCorner].label})`}
                title="Toca para moverla de esquina"
              >
                <img src={item.cover} alt="Referencia" className="w-full h-full object-cover pointer-events-none" />
              </button>
              <div className="absolute -top-2.5 -right-2.5 flex gap-1">
                <MiniCamButton
                  onClick={() => setPipBig(b => !b)}
                  ariaLabel={pipBig ? 'Encoger la referencia' : 'Agrandar la referencia'}
                >
                  {pipBig ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                </MiniCamButton>
                <MiniCamButton onClick={() => setPipHidden(true)} ariaLabel="Ocultar la referencia">
                  <X size={11} />
                </MiniCamButton>
              </div>
            </div>
          )}
          {cam.status === 'ready' && item.cover && pipHidden && (
            <button
              onClick={() => { setPipHidden(false); setPipCorner(0) }}
              className="absolute top-2 right-2 z-10 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--color-buttermilk)', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,241,181,0.5)' }}
            >
              <ImageIcon size={11} /> Mostrar referencia
            </button>
          )}
          {cam.status === 'ready' && !item.cover && (
            <span
              className="absolute top-2 left-2 right-2 z-10 px-3 py-1.5 rounded-full text-[11px] font-semibold text-center"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
            >
              Esta referencia aún no tiene foto
            </span>
          )}

          {/* Flash de captura (pantalla blanca — funciona en todos los móviles) */}
          {flashing && <div className="absolute inset-0 z-40" style={{ background: 'white' }} />}
        </div>
        </div>

        {/* Tip de Bravi */}
        <div
          className="max-w-sm mx-auto mt-3 rounded-[var(--radius-md)] p-3"
          style={{ background: 'rgba(255,241,181,0.12)', border: '1.5px solid rgba(255,241,181,0.35)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-buttermilk)', opacity: 0.85 }}>Tip de Bravi</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.tip}</p>
        </div>

        {/* Switch FOTO / VÍDEO (como la app Cámara) */}
        <div className="max-w-sm mx-auto mt-4">
          <ModeSwitch mode={cam.mode} disabled={capturingBlocked || cam.recording} onPick={switchMode} />
        </div>

        {/* Controles: [última captura + Tu cámara] · shutter · [flip + ver ref] */}
        <div className="max-w-sm mx-auto mt-3 flex items-center justify-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <LastCaptureThumb last={lastCapture} onOpen={() => setCaptureViewer(true)} />
            {showNativeCam && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                aria-label="Abrir la cámara nativa del móvil"
              >
                Tu cámara
              </button>
            )}
          </div>

          {/* Shutter: foto (blanco) · vídeo (cherry) · grabando (stop cuadrado) */}
          <button
            onClick={cam.mode === 'photo' ? shootPhoto : toggleRecord}
            disabled={capturingBlocked}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 disabled:opacity-40"
            style={{ border: '4px solid rgba(255,255,255,0.35)' }}
            aria-label={cam.mode === 'photo' ? 'Capturar foto' : cam.recording ? 'Detener la grabación' : 'Iniciar la grabación'}
          >
            {cam.mode === 'photo' ? (
              <span className="w-12 h-12 rounded-full bg-white block transition-transform" style={cam.recording ? { transform: 'scale(0.78)' } : undefined} />
            ) : cam.recording ? (
              <span className="w-7 h-7 rounded-[6px] block" style={{ background: 'var(--color-cherry)' }} />
            ) : (
              <span className="w-12 h-12 rounded-full block" style={{ background: 'var(--color-cherry)' }} />
            )}
          </button>

          <div className="flex flex-col items-center gap-2">
            <RoundSideButton onClick={onFlip} ariaLabel="Invertir cámara">
              <SwitchCamera size={19} />
            </RoundSideButton>
            {cam.torchSupported && (
              <button
                onClick={onTorch}
                aria-label={cam.torchOn ? 'Apagar el flash' : 'Encender el flash'}
                aria-pressed={cam.torchOn}
                className="w-8 h-8 rounded-full text-[10px] font-bold transition-all flex items-center justify-center"
                style={
                  cam.torchOn
                    ? { background: 'var(--color-buttermilk)', color: 'var(--color-ink)' }
                    : { background: 'rgba(255,255,255,0.14)', color: 'var(--color-buttermilk)' }
                }
              >
                <Zap size={14} />
              </button>
            )}
            <RoundSideButton onClick={() => setRefOverlay(true)} ariaLabel="Ver la referencia a pantalla completa">
              <ScanEye size={19} />
            </RoundSideButton>
          </div>
        </div>
      </div>

      {/* Input de la cámara nativa del móvil (solo touch; desktop no lo ve) */}
      {showNativeCam && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onNativeFile}
          aria-hidden="true"
        />
      )}

      {/* Ver referencia a pantalla completa (dismissible) */}
      <AnimatePresence>
        {refOverlay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-4"
            style={{ background: 'rgba(0,0,0,0.94)' }}
            onClick={() => setRefOverlay(false)}
          >
            <div className="relative max-w-[280px] w-full aspect-[4/5] rounded-[var(--radius-md)] overflow-hidden" style={{ border: '1.5px solid rgba(255,241,181,0.4)' }}>
              <RefCover item={item} />
            </div>
            <p className="text-xs px-4 text-center" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.title} — toca en cualquier parte para cerrar</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Última captura: para revisarla antes de subirla */}
      <AnimatePresence>
        {captureViewer && lastCapture && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-4"
            style={{ background: 'rgba(0,0,0,0.94)' }}
            onClick={() => setCaptureViewer(false)}
          >
            <div
              className="relative max-w-sm w-full aspect-[9/16] rounded-[var(--radius-md)] overflow-hidden flex items-center justify-center"
              style={{ border: '1.5px solid rgba(255,241,181,0.4)', background: 'rgba(0,0,0,0.4)' }}
            >
              {lastCapture.kind === 'photo' ? (
                <img src={lastCapture.url} alt="Última foto" className="w-full h-full object-cover" />
              ) : (
                <video src={lastCapture.url} controls autoPlay playsInline className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-xs px-4 text-center" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {lastCapture.kind === 'photo' ? 'Foto guardada' : 'Vídeo guardado'} — toca en cualquier parte para cerrar
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Piezas pequeñas de la cámara ───────────────────────────────
function TopButton({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-1 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

function RoundSideButton({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
      style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

function MiniCamButton({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-full flex items-center justify-center"
      style={{ background: 'var(--color-ink)', color: 'var(--color-buttermilk)', border: '1px solid rgba(255,241,181,0.6)' }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

/** Chip segmentado (FOTO/VÍDEO, HD/4K) — estilo del chip de calidad del
 *  Teleprompter: activo = blanco relleno con tinta (negra). */
function SegmentChip({ label, active, onClick, disabled }: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="flex-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-40 whitespace-nowrap"
      style={active ? { background: 'white', color: 'var(--color-ink)' } : { color: 'rgba(255,255,255,0.85)' }}
    >
      {label}
    </button>
  )
}

/** Switch FOTO/VÍDEO del visor. */
function ModeSwitch({ mode, disabled, onPick }: { mode: InspoMode; disabled: boolean; onPick: (m: InspoMode) => void }) {
  return (
    <div
      role="group"
      aria-label="Cambiar entre foto y vídeo"
      className="mx-auto flex gap-1 rounded-full p-1"
      style={{ background: 'rgba(255,255,255,0.1)', maxWidth: 230 }}
    >
      <SegmentChip label="FOTO" active={mode === 'photo'} onClick={() => onPick('photo')} disabled={disabled} />
      <SegmentChip label="VÍDEO" active={mode === 'video'} onClick={() => onPick('video')} disabled={disabled} />
    </div>
  )
}

/** Miniatura de la última captura (foto o vídeo), botón a su visor. */
function LastCaptureThumb({ last, onOpen }: { last: InspoCaptureResult | null; onOpen: () => void }) {
  if (!last) {
    return <div className="w-11 h-11 rounded-[var(--radius-md)]" style={{ border: '1.5px solid rgba(255,255,255,0.18)' }} aria-hidden="true" />
  }
  return (
    <button
      onClick={onOpen}
      className="w-11 h-11 rounded-[var(--radius-md)] overflow-hidden block transition-transform active:scale-90"
      style={{ border: '1.5px solid rgba(255,241,181,0.7)' }}
      aria-label={last.kind === 'photo' ? 'Ver la última foto' : 'Ver el último vídeo'}
    >
      {last.kind === 'photo' ? (
        <img src={last.url} alt="Última captura" className="w-full h-full object-cover" />
      ) : (
        <video src={last.url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
      )}
    </button>
  )
}

/** Cover de la referencia, o placeholder cuando aún no tiene foto. */
function RefCover({ item, big }: { item: FotoInspoItem; big?: boolean }) {
  if (item.cover) {
    return <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
  }
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: 'var(--color-warm-gray)' }}
    >
      <Camera size={big ? 44 : 38} className="text-cherry opacity-25" />
      <span className="text-[11px] font-semibold text-cherry opacity-50 text-center px-3">Foto por añadir</span>
    </div>
  )
}