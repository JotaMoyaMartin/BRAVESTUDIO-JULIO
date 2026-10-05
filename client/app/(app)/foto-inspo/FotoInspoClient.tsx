'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera, ChevronLeft, X, SwitchCamera, Image as ImageIcon,
  Maximize2, Minimize2, ScanEye,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import BraviGuide from '@/components/bravi/BraviGuide'
import {
  FOTO_INSPO_CATEGORIES, FOTO_INSPO_ITEMS,
  FotoInspoCategoryId, FotoInspoItem,
} from '@/lib/foto-inspo'

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

// ─── Cámara in-app ("Hacer esta foto") ──────────────────────────
type CamStatus = 'loading' | 'ready' | 'unsupported' | 'error'
type Facing = 'environment' | 'user'

// Esquinas del PIP, orden de ciclado con el tap: TL → TR → BR → BL.
const PIP_CORNERS: { cls: string; label: string }[] = [
  { cls: 'top-2 left-2', label: 'arriba-izquierda' },
  { cls: 'top-2 right-2', label: 'arriba-derecha' },
  { cls: 'bottom-2 right-2', label: 'abajo-derecha' },
  { cls: 'bottom-2 left-2', label: 'abajo-izquierda' },
]

function CameraView({ item, onBack }: { item: FotoInspoItem; onBack: () => void }) {
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [status, setStatus] = useState<CamStatus>('loading')
  const [flashing, setFlashing] = useState(false)
  const [pipCorner, setPipCorner] = useState(0)
  const [pipBig, setPipBig] = useState(false)
  const [pipHidden, setPipHidden] = useState(false)
  const [refOverlay, setRefOverlay] = useState(false)

  // Pedir la cámara (y re-pedir al invertir). Limpia el stream siempre.
  useEffect(() => {
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('loading')
    // Timeout: si el permiso queda pendiente demasiado tiempo (o el navegador
    // in-app bloquea la cámara sin avisar), pasamos al fallback sin colgar.
    const timeout = setTimeout(() => {
      if (!cancelled) setStatus('unsupported')
    }, 10000)
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then(s => {
        clearTimeout(timeout)
        if (cancelled) {
          s.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = s
        setStream(s)
        setStatus('ready')
      })
      .catch(() => {
        clearTimeout(timeout)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      clearTimeout(timeout)
      // Detener el stream al desmontar (volver) y al invertir cámara.
      const s = streamRef.current
      streamRef.current = null
      s?.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }, [facing])

  // Conectar el stream al <video> cuando ya está en el DOM.
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream, status])

  const capturingBlocked = status !== 'ready'

  /** Captura al tamaño real del video (respetando el espejo de la frontal). */
  async function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth || capturingBlocked) return
    setFlashing(true)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setFlashing(false)
      return
    }
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    setTimeout(() => setFlashing(false), 180)
    if (!blob) {
      toast.show('No se pudo generar la foto — prueba otra vez', 'info')
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `foto-inspo-${item.id}.jpg`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    toast.show('Foto descargada — ya puedes subirla a Instagram', 'success')
  }

  // ── Fallbacks: navegador in-app, permiso denegado o sin cámara ──
  if (status === 'unsupported' || status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: 'var(--color-ink)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <TopButton onClick={onBack} ariaLabel="Volver a la galería">
            <ChevronLeft size={16} /> Volver
          </TopButton>
        </div>
        <div className="max-w-sm mx-auto px-4 pb-10 space-y-4">
          <div className="relative mx-auto max-w-[280px] aspect-[4/5] rounded-[var(--radius-md)] overflow-hidden" style={{ border: '1.5px solid rgba(255,241,181,0.4)' }}>
            <RefCover item={item} big />
          </div>
          <div
            className="rounded-[var(--radius-md)] p-4 space-y-2"
            style={{ background: 'rgba(255,241,181,0.12)', border: '1.5px solid rgba(255,241,181,0.35)' }}
          >
            <p className="text-sm font-bold" style={{ color: 'var(--color-buttermilk)' }}>La cámara no está disponible aquí</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Prueba abriendo BRÄVE en Safari o Chrome del móvil, o haz esta foto tú: {item.tip}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-3 py-3">
        <TopButton onClick={onBack} ariaLabel="Volver a la galería">
          <ChevronLeft size={16} /> Volver
        </TopButton>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-buttermilk)', opacity: 0.8 }}>Hacer esta foto</p>
          <p className="text-sm font-bold text-white truncate">{item.title}</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        {/* Video live */}
        <div
          className="relative aspect-[9/16] max-w-sm mx-auto rounded-[var(--radius-md)] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,241,181,0.4)' }}
        >
          {status === 'ready' ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={facing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="inline-block w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-buttermilk)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Abriendo tu cámara...</p>
            </div>
          )}

          {/* PIP de referencia (o recordatorio si aún no hay foto) */}
          {status === 'ready' && item.cover && !pipHidden && (
            <div
              className={`absolute ${PIP_CORNERS[pipCorner].cls} ${pipBig ? 'w-48 md:w-56' : 'w-24 md:w-32'} z-10`}
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
          {status === 'ready' && item.cover && pipHidden && (
            <button
              onClick={() => { setPipHidden(false); setPipCorner(0) }}
              className="absolute top-2 right-2 z-10 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--color-buttermilk)', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,241,181,0.5)' }}
            >
              <ImageIcon size={11} /> Mostrar referencia
            </button>
          )}
          {status === 'ready' && !item.cover && (
            <span
              className="absolute top-2 left-2 right-2 z-10 px-3 py-1.5 rounded-full text-[11px] font-semibold text-center"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
            >
              Esta referencia aún no tiene foto
            </span>
          )}

          {/* Flash de captura */}
          {flashing && <div className="absolute inset-0 z-20" style={{ background: 'white' }} />}
        </div>

        {/* Tip de Bravi */}
        <div
          className="max-w-sm mx-auto mt-3 rounded-[var(--radius-md)] p-3"
          style={{ background: 'rgba(255,241,181,0.12)', border: '1.5px solid rgba(255,241,181,0.35)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-buttermilk)', opacity: 0.85 }}>Tip de Bravi</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.tip}</p>
        </div>

        {/* Controles */}
        <div className="max-w-sm mx-auto mt-4 flex items-center justify-center gap-6">
          <RoundSideButton onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))} ariaLabel="Invertir cámara">
            <SwitchCamera size={19} />
          </RoundSideButton>

          {/* Shutter */}
          <button
            onClick={capture}
            disabled={capturingBlocked}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 disabled:opacity-40"
            style={{ border: '4px solid rgba(255,255,255,0.35)' }}
            aria-label="Capturar foto"
          >
            <span className="w-12 h-12 rounded-full bg-white block" />
          </button>

          <RoundSideButton onClick={() => setRefOverlay(true)} ariaLabel="Ver la referencia a pantalla completa">
            <ScanEye size={19} />
          </RoundSideButton>
        </div>
      </div>

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