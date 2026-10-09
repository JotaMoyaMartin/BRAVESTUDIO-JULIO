'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Upload, Sparkles, Smile, Waves, Frame, ChevronLeft, Star,
  Download, RefreshCw, Wand2, Check,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import BraviGuide from '@/components/bravi/BraviGuide'
import BeforeAfterSlider from '@/components/photo-pro/BeforeAfterSlider'
import { MODE_META, INTENSITY_LIMIT } from '@/lib/photo-pro/presets'
import { PhotoMode, PhotoJobStatus } from '@/lib/photo-pro/types'
import { normalizePhotoFile } from '@/lib/photo-pro/normalize'

/**
 * RETOQUE PRO — flujo MVP:
 * SUBIR → AJUSTAR (photo siempre visible: modo + intensidad en UNA pantalla)
 * → APLICAR (1 toque = 1 llamada al proveedor) → ANTES/DESPUÉS → GUARDAR.
 *
 * Regla de coste: modo e intensidad son SOLO configuración local (cero llamadas).
 * Únicamente «Aplicar mejora» dispara la edición.
 */

const MODE_ICONS: Record<PhotoMode, typeof Smile> = {
  face: Smile,
  hair: Waves,
  background: Frame,
  general: Sparkles,
}

const MODE_ORDER: PhotoMode[] = ['face', 'hair', 'background', 'general']

type StageId = 'upload' | 'adjust' | 'processing' | 'result'

interface ClientJob {
  id: string
  mode: PhotoMode
  intensity: number
  status: PhotoJobStatus
  saved?: boolean
  provider?: string | null
  source_url?: string | null
  result_url?: string | null
  error_code?: string | null
  error_message?: string | null
  created_at?: string
}

interface NormalizedPhoto {
  blob: Blob
  width: number
  height: number
}

interface UploadedPhoto extends NormalizedPhoto {
  objectUrl: string
  assetPath: string
}

const SAFE_MESSAGES: Record<string, string> = {
  provider_not_configured: 'La edición con IA aún no está activa. Prueba de nuevo en unos días.',
  provider_timeout: 'La edición está tardando demasiado. Inténtalo de nuevo.',
  provider_error: 'No hemos podido editar tu foto esta vez. Inténtalo de nuevo.',
  no_image_returned: 'No hemos podido editar tu foto esta vez. Inténtalo de nuevo.',
  source_unreadable: 'No hemos podido leer la foto original. Vuelve a subirla.',
  too_many_requests: 'Has hecho muchas ediciones seguidas. Espera un momentito.',
  formato_no_valido: 'Solo aceptamos fotos JPG, PNG o WEBP.',
  foto_demasiado_grande: 'La foto es demasiado grande. Prueba con una más ligera.',
  red: 'Ha fallado la conexión. Comprueba tu internet e inténtalo de nuevo.',
}

export default function RetoqueClient({ userId, demo }: { userId: string; demo?: boolean }) {
  const toast = useToast()
  const isDemo = !!demo

  // ── flujo ────────────────────────────────────────────────────────
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mode, setMode] = useState<PhotoMode | null>(null)
  const [intensity, setIntensity] = useState<number | null>(null)
  const [stage, setStage] = useState<StageId>('upload')
  const [job, setJob] = useState<ClientJob | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // anti doble-submit (una pulsación = una llamada)
  const submittingRef = useRef(false)

  // ── historial (re-entrar a resultados) ───────────────────────────
  const [historyJobs, setHistoryJobs] = useState<ClientJob[]>([])
  useEffect(() => {
    if (isDemo) return
    fetch('/api/photo-pro/jobs')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.jobs) setHistoryJobs(data.jobs) })
      .catch(() => { /* historial no crítico */ })
  }, [isDemo])

  // timer del estado procesando
  useEffect(() => {
    if (stage !== 'processing' || jobError) return
    setElapsed(0)
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [stage, jobError])

  /* ── FLUJO 1 · SUBIR ─────────────────────────────────────────── */
  async function handleFile(file: File) {
    if (uploading) return
    setUploadError(null)
    setUploading(true)
    try {
      const normalized = await normalizePhotoFile(file)
      const objectUrl = URL.createObjectURL(normalized.blob)

      if (isDemo) {
        setPhoto({ ...normalized, objectUrl, assetPath: 'demo/source.jpg' })
      } else {
        const form = new FormData()
        form.append('file', normalized.blob, 'original.jpg')
        const res = await fetch('/api/photo-pro/upload', { method: 'POST', body: form })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.assetPath) {
          throw new Error(SAFE_MESSAGES[data?.error] || SAFE_MESSAGES.red)
        }
        setPhoto({ ...normalized, objectUrl: data.url, assetPath: data.assetPath })
      }
      setMode(null)
      setIntensity(null)
      setJob(null)
      setJobError(null)
      setStage('adjust')
    } catch (err) {
      const msg = err instanceof Error && err.message === 'decode_failed'
        ? 'No hemos podido abrir esa foto. Prueba con una JPG o PNG.'
        : err instanceof Error ? err.message : SAFE_MESSAGES.red
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  function resetPhoto() {
    if (photo) URL.revokeObjectURL(photo.objectUrl)
    setPhoto(null)
    setMode(null)
    setStage('upload')
  }

  /* ── AJUSTAR: todo local, cero llamadas ─────────────────────── */
  function pickMode(m: PhotoMode) {
    setMode(m)
    setIntensity(Math.round((1 + INTENSITY_LIMIT[m].max) / 2))
  }

  /* ── APLICAR: UN toque = UNA edición ────────────────────────── */
  async function applyEdit() {
    if (!photo || !mode || !intensity || submittingRef.current) return
    submittingRef.current = true
    setJobError(null)
    setStage('processing')
    try {
      if (isDemo) {
        // Desarrollo: simulación honesta (badge en resultado). No DB, no API.
        // URL propia del job (distinta de la preview) para que revocar la
        // preview al cambiar foto no rompa el historial demo.
        await new Promise(r => setTimeout(r, 2_200))
        const jobUrl = URL.createObjectURL(photo.blob)
        const demoJob: ClientJob = {
          id: `demo-${Date.now()}`,
          mode, intensity,
          status: 'completed',
          provider: 'mock-development',
          source_url: jobUrl,
          result_url: jobUrl,
        }
        setJob(demoJob)
        setStage('result')
        setHistoryJobs(prev => [demoJob, ...prev].slice(0, 12))
      } else {
        const res = await fetch('/api/photo-pro/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetPath: photo.assetPath, mode, intensity }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.job) {
          throw new Error(data?.error || 'red')
        }
        setJob(data.job)
        setStage('result')
        setHistoryJobs(prev => [data.job, ...prev].slice(0, 12))
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : 'red'
      setJobError(SAFE_MESSAGES[code] || SAFE_MESSAGES['provider_error'])
    } finally {
      submittingRef.current = false
    }
  }

  /* ── RESULTADO: guardar / descargar / otra versión ──────────── */
  async function saveJob() {
    if (!job) return
    if (isDemo || job.id.startsWith('demo-')) {
      setJob({ ...job, saved: true })
      toast.show('Guardada en Foto Pro', 'success')
      return
    }
    const res = await fetch(`/api/photo-pro/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: true }),
    })
    if (res.ok) {
      setJob({ ...job, saved: true })
      setHistoryJobs(prev => prev.map(j => (j.id === job.id ? { ...j, saved: true } : j)))
      toast.show('Guardada en Foto Pro ✨', 'success')
    } else {
      toast.show('No se pudo guardar — prueba otra vez', 'info')
    }
  }

  async function downloadJob() {
    if (!job?.result_url) return
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')
    const name = `foto-pro-${job.mode}-${stamp}.jpg`
    try {
      const res = await fetch(job.result_url)
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const fname = name.replace(/jpg$/, ext)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        try {
          const file = new File([blob], fname, { type: blob.type })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] })
            toast.show('Foto guardada — búscala en tus fotos', 'success')
            return
          }
        } catch (err) {
          if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError') return
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      toast.show('Foto descargada — lista para Instagram', 'success')
    } catch {
      toast.show('No se pudo descargar — prueba otra vez', 'info')
    }
  }

  function anotherVersion() {
    setMode(null)
    setIntensity(null)
    setJob(null)
    setJobError(null)
    // la foto sigue arriba: elegir otra mejora sin resubir nada (coste 0)
    setStage(photo ? 'adjust' : 'upload')
  }

  function backToStage(s: StageId) {
    setJobError(null)
    setStage(s)
  }

  const stageLabel: Record<StageId, string> = {
    upload: 'Mejora una fotografía',
    adjust: mode ? MODE_META[mode].label : '¿Qué quieres mejorar?',
    processing: 'Estamos mejorando tu foto',
    result: 'Aquí está tu foto',
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          {/* Navegación: shell → retoque */}
          <button
            onClick={() => backToStage(photo ? 'adjust' : 'upload')}
            className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 hover:opacity-100 flex items-center gap-1"
          >
            <ChevronLeft size={13} /> Foto Pro
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark mt-1">
            {stageLabel[stage]}
          </h1>
          <p className="mt-2 text-sm text-ink opacity-75 max-w-xl">
            {stage === 'upload'
              ? 'Sube una foto tuya o de una clienta. Conservaremos la identidad y el resultado original mientras mejoramos su presentación.'
              : stage === 'adjust' ? 'Elige la mejora y su intensidad con tu foto siempre delante. No se aplica nada hasta que pulses «Aplicar mejora».'
              : stage === 'processing' ? MODE_META[mode ?? job?.mode ?? 'general']?.processingCopy
              : 'Compara antes y después.'}
          </p>
        </div>
        <BraviGuide section="foto-pro" size={56} />
      </div>

      {/* ── PASO 1 · SUBIR ──────────────────────────────────────── */}
      {stage === 'upload' && (
        <div className="space-y-3">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ''
              }}
            />
            <div
              className="idea-card rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-0.5"
              style={{
                border: '2px dashed rgba(122,24,50,0.35)',
                background: 'var(--color-cream)',
                padding: '3.5rem 1.5rem',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              {uploading ? (
                <span className="w-9 h-9 border-[3px] border-cherry border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="w-14 h-14 rounded-full bg-[rgba(122,24,50,0.08)] flex items-center justify-center mb-3">
                  <Upload size={26} className="text-cherry" />
                </span>
              )}
              <p className="font-bold text-cherry-dark">
                {uploading ? 'Subiendo tu foto…' : 'Subir fotografía'}
              </p>
              <p className="mt-1.5 text-xs text-ink opacity-60">JPG, PNG o WEBP · también HEIC de iPhone</p>
            </div>
          </label>

          {uploadError && (
            <p className="text-sm font-semibold text-[var(--color-danger)]">{uploadError}</p>
          )}

          {/* Historial — re-entrar a resultados */}
          {historyJobs.length > 0 && (
            <section className="pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">
                Tus fotos mejoradas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {historyJobs.map((h, i) => (
                  <button
                    key={h.id || i}
                    onClick={() => { setJob(h); setStage('result') }}
                    className="idea-card rounded-[var(--radius-md)] overflow-hidden bg-white text-left"
                    style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
                  >
                    {h.result_url ? (
                      <div className="relative aspect-[3/4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.result_url} alt="Resultado" className="absolute inset-0 w-full h-full object-cover" />
                        {h.saved && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-buttermilk flex items-center justify-center shadow-sm">
                            <Star size={12} className="text-cherry" fill="currentColor" />
                          </span>
                        )}
                      </div>
                    ) : null}
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-cherry-dark">{MODE_META[h.mode]?.label}</p>
                      <p className="text-[10px] text-ink opacity-55">Nivel {h.intensity}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── PASO 2 · AJUSTAR — la foto SIEMPRE visible ──────────── */}
      {stage === 'adjust' && photo && (
        <div className="space-y-4">
          {/* Preview: la foto original, siempre delante al ajustar */}
          <div className="rounded-[var(--radius-lg)] overflow-hidden bg-white" style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.objectUrl}
              alt="Tu foto original"
              className="w-full max-h-[46vh] object-contain bg-[rgba(122,24,50,0.03)]"
            />
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--color-buttermilk)' }}>
              <p className="text-[11px] text-ink opacity-60">Tu foto original</p>
              <button onClick={resetPhoto} className="text-xs text-cherry opacity-70 hover:opacity-100 font-semibold">
                Cambiar foto
              </button>
            </div>
          </div>

          {/* ¿Qué mejorar? — chips compactos, cambio libre */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-2 px-0.5">
              ¿Qué quieres mejorar?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MODE_ORDER.map(m => {
                const meta = MODE_META[m]
                const Icon = MODE_ICONS[m]
                const selected = mode === m
                return (
                  <button
                    key={m}
                    onClick={() => pickMode(m)}
                    className="rounded-[var(--radius-md)] py-3 px-2 flex flex-col items-center gap-1.5 text-center transition-all"
                    style={
                      selected
                        ? { background: 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-medium)' }
                        : { background: 'white', border: '1.5px solid var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }
                    }
                  >
                    <Icon size={18} />
                    <span className="text-xs font-bold leading-tight">{meta.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-ink opacity-65 px-0.5">
              {mode ? MODE_META[mode].desc : 'Elige una sola mejora por edición.'}
            </p>
          </div>

          {/* Intensidad — solo configuración local, cero llamadas */}
          {mode && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-2 px-0.5">
                  Intensidad
                </p>
                <div className={`grid gap-2.5 ${mode === 'hair' ? 'grid-cols-5' : 'grid-cols-3'}`}>
                  {MODE_META[mode].intensities.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setIntensity(opt.value)}
                      className="rounded-[var(--radius-md)] py-3 px-1 text-center transition-all"
                      style={
                        intensity === opt.value
                          ? { background: 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-medium)' }
                          : { background: 'white', border: '1.5px solid var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }
                      }
                    >
                      <p className="font-bold text-sm">{opt.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold text-cherry-dark text-center mt-2.5">
                  {MODE_META[mode].intensities.find(o => o.value === intensity)?.microcopy}
                </p>
              </div>

              {/* Qué se mantiene + aplicar */}
              <div className="rounded-[var(--radius-lg)] p-5 bg-white" style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cherry opacity-70 mb-2">
                  Mantendremos
                </p>
                <ul className="space-y-1.5 mb-4">
                  {MODE_META[mode].willKeep.map(k => (
                    <li key={k} className="text-xs text-ink opacity-75 flex items-start gap-1.5">
                      <Check size={12} className="text-[var(--color-success)] flex-shrink-0 mt-0.5" /> {k}
                    </li>
                  ))}
                </ul>
                <Button size="lg" fullWidth onClick={() => void applyEdit()} icon={<Sparkles size={17} />}>
                  Aplicar mejora
                </Button>
                <p className="mt-2 text-[11px] text-ink opacity-50 text-center">
                  Cambiar de mejora o intensidad no consume nada hasta que aplicas.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PASO 3 · PROCESANDO (y error honesto) ────────────────── */}
      {stage === 'processing' && (
        <div className="rounded-[var(--radius-lg)] p-8 text-center bg-white" style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}>
          {jobError ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[rgba(192,57,78,0.10)] flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={22} className="text-[var(--color-danger)]" />
              </div>
              <p className="font-bold text-cherry-dark">No se pudo editar la foto</p>
              <p className="mt-2 text-sm text-ink opacity-75 max-w-sm mx-auto">{jobError}</p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button onClick={() => void applyEdit()} icon={<RefreshCw size={15} />}>Reintentar</Button>
                <Button variant="ghost" onClick={() => backToStage('adjust')}>Volver</Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full mx-auto mb-5 border-[3px] border-cherry border-t-transparent animate-spin" />
              <p className="font-bold text-cherry-dark">Estamos mejorando tu foto</p>
              <p className="mt-2 text-sm text-ink opacity-75">{MODE_META[mode ?? 'general']?.processingCopy}</p>
              <p className="mt-4 text-xs text-ink opacity-50">{elapsed}s · no cierres ni toques nada</p>
            </>
          )}
        </div>
      )}

      {/* ── PASO 4 · RESULTADO ──────────────────────────────────── */}
      {stage === 'result' && job?.status === 'completed' && job.source_url && job.result_url && (
        <div className="space-y-4">
          {job.provider === 'mock-development' && (
            <p className="text-[11px] text-ink opacity-55 bg-[rgba(122,24,50,0.06)] rounded-[var(--radius-sm)] px-3 py-1.5 inline-block">
              Ejemplo — IA no disponible aquí: se muestra tu foto de muestra
            </p>
          )}
          <BeforeAfterSlider beforeUrl={job.source_url} afterUrl={job.result_url} />
          <p className="text-center text-xs text-ink opacity-60">
            {MODE_META[job.mode]?.label} · {MODE_META[job.mode]?.intensities.find(o => o.value === job.intensity)?.label || `Nivel ${job.intensity}`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => void saveJob()} icon={<Star size={15} fill={job.saved ? 'currentColor' : 'none'} />}>
              {job.saved ? 'Guardada' : 'Guardar'}
            </Button>
            <Button onClick={() => void downloadJob()} icon={<Download size={15} />}>Descargar</Button>
          </div>
          <Button variant="ghost" fullWidth onClick={anotherVersion} icon={<Wand2 size={15} />}>
            Crear otra versión
          </Button>
          {photo && (
            <button onClick={() => setStage('adjust')} className="w-full text-center text-xs text-cherry opacity-70 hover:opacity-100 font-semibold">
              Ajustar de nuevo
            </button>
          )}
        </div>
      )}
    </div>
  )
}