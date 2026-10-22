'use client'
/**
 * Editar Videos — v2.1 (13-oct-2026): interfaz "reel review".
 * 1 Subir (transcribe automático: audio extraído en el navegador → API) →
 * 2 Editor con tabs Cortes / Recursos / Subtítulos / Exportar + player en vivo
 *   (reproduce el video crudo con los cortes saltados al momento, subtítulos y
 *   recursos como overlays DOM — sin exportar para ver el resultado).
 * 3 Descargar (ffmpeg.wasm una pasada: cortes + captions + recursos quemados).
 * El video nunca sale del dispositivo; solo el audio (mp3 mono) para transcribir.
 * Muletillas a nivel PALABRA: se cutan de la voz y quedan en los subtítulos.
 * Defaults de marca (captions on/size) se recuerdan para el próximo reel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { DEMO_WORDS } from '@/lib/editar-videos/demo-transcript'
import { pcm16kFromFile, transcribeLocal, webgpuReady } from '@/lib/editar-videos/local-asr'
import {
  buildKeeps, buildOutWords, complementKeeps, detectGaps, groupPhrases, markFillers,
  markRepeats, mapOutToSrc, mapSrcToOut, buildExportGraph, computeRmsTrack, snapGapsToSilence,
  EvGap, EvPhrase, EvWord, RESOURCE_DUR, EvResource, EvSpan, RmsTrack,
} from '@/lib/editar-videos/core'
import {
  Upload, Scissors, Download, ChevronLeft, Check, Circle, Loader2,
  Wand2, Trash2, Type, Hash, SquareStack, Sparkles, Play as PlayIcon,
} from 'lucide-react'

type Step = 'upload' | 'editor' | 'export' | 'done'

/** Energía RMS del audio del archivo (para enganchar los cortes donde la voz ya calla). */
async function computeRmsForFile(f: File): Promise<RmsTrack | null> {
  try {
    const ac = new AudioContext()
    const audio = await ac.decodeAudioData(await f.arrayBuffer())
    const ch = audio.numberOfChannels
    const mono = new Float32Array(audio.length)
    for (let c = 0; c < ch; c++) {
      const data = audio.getChannelData(c)
      for (let i = 0; i < data.length; i++) mono[i] += data[i] / ch
    }
    void ac.close()
    return computeRmsTrack(mono, audio.sampleRate)
  } catch { return null }
}
type Tab = 'cortes' | 'recursos' | 'subtitulos' | 'exportar'
const TABS: { key: Tab; label: string }[] = [
  { key: 'cortes', label: 'Cortes' },
  { key: 'recursos', label: 'Graficos' },
  { key: 'subtitulos', label: 'Subtítulos' },
  { key: 'exportar', label: 'Exportar' },
]

const STEPS: { label: string; key: Step }[] = [
  { label: 'Subir video', key: 'upload' },
  { label: 'Editar', key: 'editor' },
  { label: 'Descargar', key: 'export' },
]

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`
}

function tagsLabel(tag: string): string {
  const ICONS: Record<string, string> = { repetido: 'Repetido', corta: 'Muletilla', silencio: 'Silencio' }
  return ICONS[tag] ?? tag
}

// ---- motor ffmpeg.wasm (singleton) ----
let ffSingleton: import('@ffmpeg/ffmpeg').FFmpeg | null = null
const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'

async function loadEngine() {
  if (ffSingleton) return ffSingleton
  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')
  const ff = new FFmpeg()
  await ff.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffSingleton = ff
  return ff
}

async function transcribeAudio(blob: Blob): Promise<{ words: EvWord[]; noKey?: boolean }> {
  const form = new FormData()
  form.append('audio', blob, 'audio.mp3')
  const res = await fetch('/api/editar-videos/transcribe', { method: 'POST', body: form })
  const json = await res.json().catch(() => ({}))
  if (res.status === 501 || json.error === 'no_key') return { words: [], noKey: true }
  if (!res.ok) throw new Error(json.error || 'transcribe_failed')
  return { words: (json.words ?? []) as EvWord[] }
}

export default function EditarVideosClient() {
  const toast = useToast()
  const [step, setStep] = useState<Step>('upload')
  const [tab, setTab] = useState<Tab>('cortes')
  const [file, setFile] = useState<File | null>(null)
  const [srcUrl, setSrcUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [videoSize, setVideoSize] = useState<{ w: number; h: number }>({ w: 1080, h: 1920 })
  const [words, setWords] = useState<EvWord[] | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeNote, setTranscribeNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [capSize, setCapSize] = useState(0.054)
  const [resources, setResources] = useState<EvResource[]>([])
  const [pct, setPct] = useState(0)
  const [rms, setRms] = useState<RmsTrack | null>(null)
  const [workSec, setWorkSec] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null) // video de la pantalla subir
  const outUrlRef = useRef('')
  const playEndRef = useRef(0)
  const [playingId, setPlayingId] = useState<string | null>(null)

  // ---- player del editor (rough cut en vivo) ----
  const STAGE_W = 288
  const STAGE_H = 512
  const prevRef = useRef<HTMLVideoElement | null>(null)
  const [previewT, setPreviewT] = useState(1)
  const [playing, setPlaying] = useState(false)
  const srcAtRef = useRef(0)

  useEffect(() => () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    if (resultUrl && resultUrl !== srcUrl) URL.revokeObjectURL(resultUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- defaults de marca (se recuerdan entre reels) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem('brave_ev_defaults')
      if (raw) {
        const d = JSON.parse(raw)
        if (typeof d.captionsOn === 'boolean') setCaptionsOn(d.captionsOn)
        if (Number(d.capSize) > 0) setCapSize(Number(d.capSize))
      }
    } catch { /* demo sin storage */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('brave_ev_defaults', JSON.stringify({ captionsOn, capSize })) } catch { /* */ }
  }, [captionsOn, capSize])

  // ---- derivados ----
  const phrases: EvPhrase[] = words ? markRepeats(markFillers(groupPhrases(words))) : []
  // los bordes de los silencios se enganchan al punto más silencioso real del audio
  const gaps: EvGap[] = words
    ? (rms ? snapGapsToSilence(detectGaps(phrases, duration), rms) : detectGaps(phrases, duration))
    : []
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const toggle = (key: string, def: boolean) =>
    setOverrides(o => ({ ...o, [key]: !(key in o ? o[key] : def) }))

  const isPhraseCut = (key: string, def: boolean): boolean => (key in overrides ? overrides[key] : def)

  const effectivePhrases = phrases.map((p, i) => ({ ...p, cut: isPhraseCut(p.id, p.cut) }))
  const effectiveGaps = gaps.map((g, i) => ({ ...g, cut: isPhraseCut(`gap${i}`, g.cut) }))

  // muletillas por defecto: cortadas de la voz
  const fillerKeys = useMemo(() => {
    const keys: { key: string; start: number; end: number }[] = []
    for (const p of phrases.filter(p => !p.cut)) {
      for (let i = 0; i < p.words.length; i++) {
        const w = p.words[i]
        if (w.filler) keys.push({ key: `w:${p.id}:${i}`, start: w.start, end: w.end })
      }
    }
    return keys
  }, [phrases])
  const effectiveFillers = fillerKeys.map(f => ({ ...f, cut: isPhraseCut(f.key, true) }))
  const wordCuts: EvSpan[] = effectiveFillers
    .filter(f => f.cut)
    .map(f => ({ start: f.start - 0.03, end: f.end + 0.03 }))

  const cutSeconds = effectivePhrases.filter(p => p.cut).reduce((s, p) => s + p.end - p.start, 0) +
    effectiveGaps.filter(g => g.cut).reduce((s, g) => s + g.end - g.start, 0) +
    wordCuts.reduce((s, w) => s + w.end - w.start, 0)
  const finalDuration = duration - cutSeconds
  const keepCount = effectivePhrases.filter(p => !p.cut).length

  // changelog "Lo que hicimos en tu reel"
  const cutGaps = effectiveGaps.filter(g => g.cut)
  const cutPhrases = effectivePhrases.filter(p => p.cut)
  const cutRepeats = cutPhrases.filter(p => p.tags.includes('repetido'))
  const silSec = cutGaps.reduce((s, g) => s + g.end - g.start, 0)
  const phraseSec = cutPhrases.reduce((s, p) => s + p.end - p.start, 0)

  // keeps para player/export (idénticos)
  const keeps = useMemo(
    () => buildKeeps(effectivePhrases, effectiveGaps, duration, wordCuts),
    [words, overrides, duration, rms], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const cutSpans = useMemo(() => complementKeeps(keeps, duration), [keeps, duration])
  const previewWords = useMemo(
    () => (captionsOn ? buildOutWords(effectivePhrases, keeps, wordCuts) : []),
    [keeps, captionsOn], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const srcAt = mapOutToSrc(keeps, previewT)
  srcAtRef.current = srcAt
  const capWord = previewWords.find(w => previewT >= w.outStart - 0.01 && previewT <= w.outEnd + 0.02)
  const activeRes = resources.filter(r => previewT >= r.showStart && previewT <= r.showEnd)

  // sincroniza el frame del player con previewT (y mini-clips)
  useEffect(() => {
    const v = prevRef.current
    if (!v || step !== 'editor' || !srcUrl) return
    if (!playing) {
      const target = Math.max(0, Math.min(srcAt, (v.duration || duration) - 0.05))
      if (v.readyState >= 1 && Math.abs(v.currentTime - target) > 0.04) v.currentTime = target
    }
    const host = v.parentElement
    if (host) {
      for (const el of Array.from(host.querySelectorAll<HTMLVideoElement>('video.ev-mini'))) {
        const base = Number(el.dataset.start || 0)
        const show = Number(el.dataset.show || 0)
        const mt = base + Math.max(0, Math.min(previewT - show, 2.2))
        if (el.readyState >= 1 && Math.abs(el.currentTime - mt) > 0.04) el.currentTime = mt
      }
    }
  })

  // reproducción en vivo saltando cortes (rough cut sin suavizar)
  useEffect(() => {
    if (step !== 'editor' || !playing) return
    const iv = setInterval(() => {
      const v = prevRef.current
      if (!v) return
      const t = v.currentTime
      const cut = cutSpans.find(c => t >= c.start - 0.02 && t < c.end)
      if (cut) {
        const next = keeps.find(k => k.start >= cut.end - 0.02)
        v.currentTime = next ? next.start + 0.02 : Math.max(v.duration - 0.05, 0)
      }
      if (playEndRef.current > 0 && t >= playEndRef.current) {
        v.pause()
        playEndRef.current = 0
        setPlaying(false)
        setPlayingId(null)
        return
      }
      if (v.ended) {
        setPlaying(false)
      }
      // el navegador puede pausar el elemento solo (autoplay policy / buffer):
      // reanudamos mientras playing siga activo y no haya parada de frase
      if (v.paused && !v.ended && playEndRef.current === 0) void v.play().catch(() => {})
      setPreviewT(mapSrcToOut(keeps, v.currentTime))
    }, 110)
    return () => clearInterval(iv)
  }, [step, playing, cutSpans, keeps])

  useEffect(() => { if (step === 'editor') { setPreviewT(1); setPlaying(false); prevRef.current?.pause() } }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const playPause = () => {
    const v = prevRef.current
    if (!v) return
    if (playing) {
      v.pause()
      setPlaying(false)
    } else {
      v.currentTime = Math.max(0, Math.min(srcAtRef.current, v.duration - 0.05))
      void v.play().catch(() => {})
      setPlaying(true)
    }
  }

  // ---- subir + transcribir automático ----
  const runIdRef = useRef(0)
  const cancelTranscribe = () => {
    runIdRef.current += 1 // invalida la corrida en curso (su resultado se descarta)
    setTranscribing(false)
    setTranscribeNote('')
    setStep('upload')
  }
  const afterFile = useCallback(async (f: File) => {
    const runId = ++runIdRef.current
    const alive = () => runIdRef.current === runId
    setFile(f)
    setWords(null)
    setResultUrl('')
    setOverrides({})
    setResources([])
    setRms(null)
    void computeRmsForFile(f).then(setRms)
    const url = URL.createObjectURL(f)
    setSrcUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    setTranscribing(true)
    setTranscribeNote('')
    try {
      // camino 1 · transcripción LOCAL (como Yapper Edita): whisper en tu
      // navegador con WebGPU — sin key, sin coste, el audio no sale del dispositivo
      if (await webgpuReady()) {
        try {
          if (!alive()) return
          const pcm = await pcm16kFromFile(f)
          const localWords = await transcribeLocal(pcm, msg => { if (alive()) setTranscribeNote(msg) })
          if (!alive()) return
          if (localWords.length > 0) {
            if (videoRef.current?.duration) setDuration(videoRef.current.duration)
            setWords(localWords)
            setStep('editor')
            return
          }
        } catch (e) {
          console.warn('Transcripción local no disponible — uso el servidor como respaldo', e)
        }
      }
      // camino 2 · servidor con key IA (respaldo)
      setTranscribeNote('Preparando el motor (una vez, quedará en caché)…')
      await loadEngine()
      setTranscribeNote('Extrayendo el audio…')
      const ext = f.name.split('.').pop()?.toLowerCase() === 'mov' ? 'mov' : 'mp4'
      // el audio se extrae en el propio navegador; abajo se lee del motor
      const ff = ffSingleton!
      await ff.writeFile(`input.${ext}`, new Uint8Array(await f.arrayBuffer()))
      await ff.exec(['-i', `input.${ext}`, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', 'audio.mp3'])
      const audio = await ff.readFile('audio.mp3')
      await ff.deleteFile('audio.mp3')
      setTranscribeNote('Transcribiendo…')
      const out = await transcribeAudio(new Blob([(audio as Uint8Array).buffer as ArrayBuffer], { type: 'audio/mp3' }))
      if (!alive()) return
      if (out.noKey) {
        // sin clave IA en el servidor: transcripción demo para poder probar el flujo
        setTranscribeNote('')
        toast.show('Transcripción IA no configurada — muestro el ejemplo de Rodolfo', 'info')
        setWords(DEMO_WORDS)
        setStep('editor')
        return
      }
      if (out.words.length === 0) {
        toast.show('No se detectó voz en este video', 'info')
        return
      }
      if (!alive()) return
      if (videoRef.current?.duration) setDuration(videoRef.current.duration)
      setWords(out.words)
      setStep('editor')
    } catch (e) {
      console.error(e)
      if (alive()) toast.show('No se pudo transcribir el audio de este video', 'info')
    } finally {
      // si cancelaron y ya arrancó otra corrida, no pisar su spinner
      if (alive()) { setTranscribing(false); setTranscribeNote('') }
    }
  }, [toast])

  const loadDemo = useCallback(async () => {
    const res = await fetch('/demo/editar-videos-demo.mp4')
    const blob = await res.blob()
    const f = new File([blob], 'reel-ejemplo.mp4', { type: 'video/mp4' })
    setFile(f)
    const url = URL.createObjectURL(f)
    setSrcUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    setWords(null)
    setVideoSize({ w: 240, h: 426 })
    setDuration(116.94)
    setWords(DEMO_WORDS)
    setOverrides({})
    setRms(null)
    void computeRmsForFile(f).then(setRms)
    setStep('editor')
  }, [])

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > 250 * 1024 * 1024) {
      toast.show('El video pesa más de 250 MB — prueba con un clip más corto', 'info')
      return
    }
    void afterFile(f)
  }

  // ---- oír una frase (player) ----
  const playPhrase = (p: EvPhrase) => {
    const v = prevRef.current
    if (!v) return
    const outT = mapSrcToOut(keeps, p.start)
    setPreviewT(outT)
    v.currentTime = Math.max(0, p.start + 0.02)
    void v.play().catch(() => {})
    setPlaying(true)
    setPlayingId(p.id)
    playEndRef.current = p.end
  }

  // ---- recursos ----
  const addResource = (kind: EvResource['kind']) => {
    const defaultShow = Math.max(0.5, Math.max(0, finalDuration - RESOURCE_DUR - 0.2))
    const base: EvResource = {
      id: `r${Date.now()}`,
      kind,
      label: kind === 'clip' ? 'Mini-clip de otro momento' : kind === 'sticker' ? 'Sticker BRÄVE' : kind === 'text' ? 'Texto grande' : 'Número',
      showStart: defaultShow,
      showEnd: defaultShow + RESOURCE_DUR,
      src: kind === 'clip' ? { start: Math.min(file ? duration - 2.5 : 0, 1.0), end: Math.min(file ? duration - 2.5 : 0, 1.0) + 2.2 } : undefined,
      text: kind === 'text' ? 'Sigue para más' : kind === 'number' ? '1' : undefined,
      pngPath: kind === 'sticker' ? '/bravi2.png' : undefined,
    }
    setResources(rs => [...rs, base])
    // ver el recurso en el player al añadirlo
    setPreviewT(defaultShow + 1)
    if (kind === 'clip') setTab('recursos')
  }
  const patchResource = (id: string, patch: Partial<EvResource>) =>
    setResources(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const removeResource = (id: string) => setResources(rs => rs.filter(r => r.id !== id))

  // ---- export ----
  const pctRef = useRef(0); pctRef.current = pct
  const exportar = useCallback(async () => {
    setStep('export')
    setPct(0)
    const t0 = Date.now()
    const outDur = keeps.reduce((s, k) => s + k.end - k.start, 0)
    try {
      const ff = await loadEngine()
      const ext = file?.name.split('.').pop()?.toLowerCase() === 'mov' ? 'mov' : 'mp4'
      await ff.writeFile(`input.${ext}`, new Uint8Array(await file!.arrayBuffer()))
      // fuentes
      const { fetchFile } = await import('@ffmpeg/util')
      const fontMed = await fetchFile('/fonts/Montserrat-Medium.ttf')
      const fontBold = await fetchFile('/fonts/Montserrat-Bold.ttf')
      await ff.writeFile('font-medium.ttf', fontMed)
      await ff.writeFile('font-bold.ttf', fontBold)
      for (const r of resources) {
        if (r.kind === 'sticker' && r.pngPath) {
          const png = await fetchFile(r.pngPath)
          await ff.writeFile(`st${resources.indexOf(r)}.png`, png)
        }
      }
      const captionWords = captionsOn ? previewWords : []
      const graph = buildExportGraph({
        keeps, duration, videoW: videoSize.w, videoH: videoSize.h,
        captions: { enabled: captionsOn && captionWords.length > 0, sizeRatio: capSize, yRatio: 0.65, color: 'white' },
        outWords: captionWords,
        resources, inputExt: ext,
        fonts: { medium: 'font-medium.ttf', bold: 'font-bold.ttf' },
      })
      const args: string[] = ['-i', `input.${ext}`]
      for (const n of graph.inputs) args.push('-i', n)
      args.push(
        '-filter_complex', graph.filter,
        '-map', `[${graph.videoOut}]`, '-map', '[outa]',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        'out.mp4',
      )
      const onProgress = ({ progress, time }: { progress: number; time: number }) => {
        const p = progress > 0 && progress <= 1 ? progress : time / Math.max(0.1, outDur)
        setPct(pctRef.current < Math.min(99, Math.round(p * 100)) ? Math.min(99, Math.round(p * 100)) : pctRef.current)
      }
      ff.on('progress', onProgress)
      await ff.exec(args)
      ff.off('progress', onProgress)
      const data = await ff.readFile('out.mp4')
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: 'video/mp4' })
      if (outUrlRef.current && outUrlRef.current !== srcUrl) URL.revokeObjectURL(outUrlRef.current)
      outUrlRef.current = URL.createObjectURL(blob)
      setResultUrl(outUrlRef.current)
      setPct(100)
      setWorkSec(Math.round((Date.now() - t0) / 1000))
      setStep('done')
    } catch (e) {
      console.error(e)
      toast.show('No se pudo procesar el video — prueba de nuevo', 'info')
      setStep('editor')
    }
  }, [keeps, previewWords, duration, file, resources, captionsOn, capSize, videoSize, srcUrl, toast])

  const reset = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    if (outUrlRef.current && outUrlRef.current !== srcUrl) URL.revokeObjectURL(outUrlRef.current)
    outUrlRef.current = ''
    setFile(null); setSrcUrl(''); setWords(null); setDuration(0)
    setResultUrl(''); setPct(0); setResources([]); setOverrides({}); setWorkSec(0); setStep('upload'); setTab('cortes')
  }

  const stepIdx = step === 'upload' ? 0 : step === 'editor' ? 1 : 3

  return (
    <div>
      {/* título + avance */}
      <div>
        <h1 className="text-2xl font-bold text-cherry-dark sm:text-3xl">Editar videos</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink opacity-70">
          Tu reel, editado como un pro: transcribimos, detectamos repetidos, muletillas y silencios, y dejas solo lo que tiene sentido. Todo en tu dispositivo.
        </p>
        <div className="mt-4 flex items-center gap-2">
          {STEPS.map(({ label, key }) => {
            const idx = STEPS.findIndex(s => s.key === key)
            const active = stepIdx === idx
            const done = stepIdx > idx
            return (
              <div key={key} className="flex items-center gap-2">
                {idx > 0 && <span className="h-px w-6 bg-[rgba(122,24,50,0.15)] sm:w-10" />}
                <div className={[
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                  active ? 'bg-cherry text-white' : done ? 'bg-[rgba(122,24,50,0.08)] text-cherry-dark' : 'bg-[var(--color-warm-gray)] text-ink opacity-60',
                ].join(' ')}>
                  {done ? <Check size={13} /> : <span className={active ? '' : 'opacity-60'}>{idx + 1}</span>}
                  {label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 1 · subir */}
      {step === 'upload' && (
        <Card className="mt-5">
          {transcribing ? (
            <div className="flex flex-col items-center text-center py-10">
              <Loader2 size={26} className="text-cherry animate-spin" />
              <p className="mt-3 font-semibold text-cherry-dark">Preparando tu reel…</p>
              <p className="mt-1 text-xs text-ink opacity-60">{transcribeNote || 'Un momento'}</p>
              <Button variant="ghost" size="sm" className="mt-4" onClick={cancelTranscribe} icon={<ChevronLeft size={14} />}>
                Cancelar y volver
              </Button>
            </div>
          ) : file && srcUrl ? (
            <div className="mt-4">
              <video ref={videoRef} src={srcUrl} controls playsInline onLoadedMetadata={e => {
                setDuration(e.currentTarget.duration || 0)
                if (e.currentTarget.videoWidth) setVideoSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })
              }} className="mx-auto max-h-[46vh] rounded-[var(--radius-md)] bg-black" />
              {duration > 0 && (
                <p className="mt-2 text-center text-xs text-ink opacity-60">{fmt(duration)} min · {(file.size / 1e6).toFixed(0)} MB</p>
              )}
              <div className="mt-3 flex justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { if (srcUrl && file) void afterFile(file) }} icon={<Scissors size={14} />}>
                  Repetir transcripción
                </Button>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[rgba(122,24,50,0.25)] px-4 py-2.5 text-sm font-semibold text-cherry-dark transition-colors hover:bg-[rgba(122,24,50,0.05)]">
                  <Upload size={14} />
                  Elegir otro video
                  <input type="file" accept="video/mp4,video/quicktime,video/*" className="hidden" onChange={e => { e.target.files?.[0] && onFile(e.target.files[0]); e.target.value = '' }} />
                </label>
              </div>
            </div>
          ) : (
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]) }}
              className={['mt-2 block cursor-pointer rounded-[var(--radius-md)] border-2 border-dashed p-8 text-center transition-colors', dragOver ? 'border-cherry bg-[rgba(122,24,50,0.05)]' : 'border-[rgba(122,24,50,0.25)] hover:border-cherry'].join(' ')}
            >
              <input type="file" accept="video/mp4,video/quicktime,video/*" className="hidden" onChange={e => { e.target.files?.[0] && afterFile(e.target.files[0]) }} />
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[rgba(122,24,50,0.08)] flex items-center justify-center mx-auto mb-4">
                <Upload size={22} className="text-cherry" />
              </div>
              <p className="font-semibold text-cherry-dark">Sube tu reel grabado</p>
              <p className="mt-1 text-xs text-ink opacity-60">Arrastra o haz clic · MP4 / MOV · hasta ~3 min</p>
              <p className="mt-3 text-[11px] text-ink opacity-50 max-w-xs mx-auto">Transcribimos en tu dispositivo si tu navegador puede (sin salir nada); si no, solo viaja el audio como respaldo. El video nunca se sube.</p>
            </label>
          )}

          {!transcribing && (
            <div className="mt-5 text-center">
              <Button variant="ghost" size="sm" onClick={() => void loadDemo()} icon={<Sparkles size={14} />}>
                Ver con un ejemplo completo
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 2 · editor reel-review */}
      {step === 'editor' && words && (
        <div className="mt-5">
          <Card>
            {/* header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-cherry-dark">Reel review</p>
                <p className="text-xs text-ink opacity-60 mt-0.5 tabular-nums">
                  Crudo {fmt(duration)} → reel {fmt(finalDuration)} · {cutSeconds > 0.5 ? `quitamos ${cutSeconds.toFixed(0)} s` : 'sin cortes automático'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} icon={<ChevronLeft size={14} />}>Otro video</Button>
            </div>

            {/* player en vivo (rough cut) */}
            {srcUrl && (
              <div className="mt-4 flex flex-col items-center">
                <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-black" style={{ width: STAGE_W, height: STAGE_H }}>
                  <video
                    ref={prevRef}
                    src={srcUrl}
                    muted={false}
                    playsInline
                    preload="auto"
                    onLoadedMetadata={e => {
                      const v = e.currentTarget
                      v.currentTime = Math.max(0, Math.min(srcAtRef.current, (v.duration || duration) - 0.05))
                      if (v.videoWidth) setVideoSize({ w: v.videoWidth, h: v.videoHeight })
                      if (v.duration) setDuration(v.duration)
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {captionsOn && capWord && (
                    <span
                      className="pointer-events-none absolute left-0 right-0 text-center font-medium text-white"
                      style={{ top: '65%', transform: 'translateY(-50%)', fontSize: Math.round(STAGE_H * capSize), fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {capWord.text.toLowerCase()}
                    </span>
                  )}
                  {activeRes.map(r => {
                    const scale = STAGE_W / videoSize.w
                    const top = Math.round(videoSize.h * 0.16 * (STAGE_H / videoSize.h))
                    const right = Math.round(44 * scale)
                    if (r.kind === 'clip' && r.src) {
                      return (
                        <video
                          key={r.id}
                          src={srcUrl}
                          muted
                          playsInline
                          data-start={r.src.start}
                          data-show={r.showStart}
                          className="ev-mini absolute bg-black"
                          style={{ top, right, width: Math.round(videoSize.w * 0.26 * scale), height: 74 * (16 / 9), border: '2px solid #fff', objectFit: 'cover' }}
                        />
                      )
                    }
                    if (r.kind === 'sticker' && r.pngPath) {
                      const w = Math.round((videoSize.h * 0.13) * (STAGE_W / videoSize.w))
                      return <img key={r.id} src={r.pngPath} alt="" className="absolute" style={{ top, right, width: w }} />
                    }
                    if (r.kind === 'text' && r.text) {
                      return (
                        <span
                          key={r.id}
                          className="absolute mx-auto w-fit text-center font-extrabold text-white"
                          style={{
                            top: Math.round(videoSize.h * 0.3 * (STAGE_H / videoSize.h)),
                            fontSize: Math.round(videoSize.h * 0.062 * (STAGE_H / videoSize.h)),
                            background: 'rgba(89,20,39,0.8)',
                            padding: `${Math.round(28 * (STAGE_H / videoSize.h) / 2)}px ${Math.round(28 * (STAGE_W / videoSize.w))}px`,
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >
                          {r.text}
                        </span>
                      )
                    }
                    if (r.kind === 'number' && r.text) {
                      return (
                        <span
                          key={r.id}
                          className="absolute font-extrabold"
                          style={{
                            left: Math.round(64 * (STAGE_W / videoSize.w)),
                            top: Math.round(videoSize.h * 0.28 * (STAGE_H / videoSize.h)),
                            fontSize: Math.round(videoSize.h / 3.2 * (STAGE_H / videoSize.h)),
                            color: 'var(--color-cream)',
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >
                          {r.text}
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={playPause}
                    aria-label={playing ? 'Pausar' : 'Reproducir el corte'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cherry text-white hover:bg-cherry-dark"
                  >
                    {playing ? <Pause size={15} /> : <PlayIcon size={15} className="ml-0.5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.5, finalDuration - 0.1)}
                    step={0.05}
                    value={previewT}
                    onChange={e => { setPlaying(false); prevRef.current?.pause(); setPreviewT(Number(e.target.value)) }}
                    className="w-56 accent-[var(--color-cherry)]"
                    aria-label="Segundo del video final"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink opacity-50 tabular-nums">
                  Se reproduce con tus cortes, en vivo · segundo {previewT.toFixed(1)} de {finalDuration.toFixed(1)}
                </p>
              </div>
            )}

            {/* tabs */}
            <div className="mt-5 flex flex-wrap gap-1.5 border-b border-[rgba(122,24,50,0.1)] pb-3">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={['rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors', tab === t.key ? 'bg-cherry text-white' : 'bg-[var(--color-warm-gray)] text-ink opacity-70 hover:opacity-100'].join(' ')}
                >
                  {t.label}{t.key === 'cortes' && cutSeconds > 0.5 ? ' ●' : ''}{t.key === 'recursos' && resources.length > 0 ? ` ${resources.length}` : ''}
                </button>
              ))}
            </div>

            {/* TAB cortes */}
            {tab === 'cortes' && (
              <div className="mt-4">
                {/* barra de timeline */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[rgba(122,24,50,0.12)]">
                  {keeps.map((k, i) => (
                    <div key={i} style={{ flexGrow: k.end - k.start, marginLeft: i === 0 ? k.start / duration * 100 + '%' : undefined }} className="h-full bg-cherry" />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] tabular-nums text-ink opacity-45">
                  <span>crudo {fmt(duration)}</span><span>final {fmt(finalDuration)}</span>
                </div>

                <p className="mt-4 text-xs text-ink opacity-60">
                  Desmárcale lo que quieras conservar. Toca una frase para oírla.
                </p>

                {effectivePhrases.length === 0 ? (
                  <p className="mt-4 text-sm text-ink opacity-70">No se detectó voz en este video.</p>
                ) : (
                  <div className="mt-2 max-h-[46vh] divide-y divide-[rgba(122,24,50,0.08)] overflow-auto rounded-[var(--radius-sm)] border border-soft">
                    {effectivePhrases.map(p => (
                      <div key={p.id}>
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <button
                            onClick={() => toggle(p.id, p.cut)}
                            aria-label={isPhraseCut(p.id, p.cut) ? 'Conservar frase' : 'Quitar frase'}
                            className="shrink-0"
                          >
                            {isPhraseCut(p.id, p.cut) ? <Circle size={18} className="text-ink opacity-25" /> : <Check size={18} className="text-cherry" />}
                          </button>
                          <button onClick={() => playPhrase(p)} className="min-w-0 flex-1 text-left group">
                            <p className={[
                              'truncate text-sm leading-snug',
                              isPhraseCut(p.id, p.cut) ? 'text-ink opacity-35 line-through' : 'text-ink group-hover:text-cherry-dark',
                              playingId === p.id ? 'font-semibold text-cherry-dark' : '',
                            ].join(' ')}>
                              {p.text}
                            </p>
                            <p className="text-[11px] text-ink opacity-45 tabular-nums">
                              {fmt(p.start)}{p.tags.length > 0 && p.tags.map(t => ` · ${tagsLabel(t)}`).join('')}
                            </p>
                          </button>
                        </div>
                        {p.words.some(w => w.filler) && !p.cut && (
                          <div className="flex flex-wrap gap-1.5 px-4 pb-2.5 pl-11">
                            {p.words.map((w, wi) => w.filler ? (
                              <button
                                key={wi}
                                onClick={() => toggle(`w:${p.id}:${wi}`, true)}
                                className={[
                                  'text-[11px] font-semibold rounded-full px-2 py-0.5 border transition-colors',
                                  isPhraseCut(`w:${p.id}:${wi}`, true)
                                    ? 'border-[rgba(122,24,50,0.3)] bg-[rgba(122,24,50,0.08)] text-cherry-dark line-through'
                                    : 'border-soft text-ink opacity-60',
                                ].join(' ')}
                                title="Se corta de la voz y queda en los subtítulos"
                              >
                                {w.text}
                              </button>
                            ) : null)}
                          </div>
                        )}
                      </div>
                    ))}
                    {effectiveGaps.length > 0 && (
                      <div className="bg-[var(--color-warm-gray)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-cherry-dark opacity-70">
                        Silencios
                      </div>
                    )}
                    {effectiveGaps.map((g, i) => (
                      <div key={`g${i}`} className="flex items-center gap-3 px-4 py-2">
                        <button onClick={() => toggle(`gap${i}`, g.cut)} className="shrink-0" aria-label="Alternar silencio">
                          {isPhraseCut(`gap${i}`, g.cut) ? <Check size={16} className="text-cherry" /> : <Circle size={16} className="text-ink opacity-25" />}
                        </button>
                        <span className="text-xs text-ink opacity-70 tabular-nums">silencio {fmt(g.start)} → {fmt(g.end)} ({(g.end - g.start).toFixed(1)} s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB recursos */}
            {tab === 'recursos' && (
              <div className="mt-4">
                <p className="text-xs text-ink opacity-60">Toques extras que aparecen sobre tu video, con su segunda exacta.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => addResource('clip')} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-soft bg-[var(--color-cream)] px-3 py-2.5 text-left hover:-translate-y-0.5 transition-transform">
                    <SquareStack size={16} className="text-cherry" />
                    <span className="text-xs font-semibold text-cherry-dark">Mini-clip de otro momento</span>
                  </button>
                  <button onClick={() => addResource('sticker')} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-soft bg-[var(--color-cream)] px-3 py-2.5 text-left hover:-translate-y-0.5 transition-transform">
                    <Sparkles size={16} className="text-cherry" />
                    <span className="text-xs font-semibold text-cherry-dark">Sticker BRÄVE</span>
                  </button>
                  <button onClick={() => addResource('text')} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-soft bg-[var(--color-cream)] px-3 py-2.5 text-left hover:-translate-y-0.5 transition-transform">
                    <Type size={16} className="text-cherry" />
                    <span className="text-xs font-semibold text-cherry-dark">Texto grande</span>
                  </button>
                  <button onClick={() => addResource('number')} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-soft bg-[var(--color-cream)] px-3 py-2.5 text-left hover:-translate-y-0.5 transition-transform">
                    <Hash size={16} className="text-cherry" />
                    <span className="text-xs font-semibold text-cherry-dark">Número</span>
                  </button>
                </div>

                {resources.length === 0 ? (
                  <p className="mt-4 text-xs text-ink opacity-45">Aún no hay recursos — toca uno de arriba.</p>
                ) : (
                  <div className="mt-4">
                    {resources.map(r => (
                      <div key={r.id} className="mb-2 rounded-[var(--radius-sm)] border border-soft p-3">
                        <div className="flex items-center gap-2">
                          <Wand2 size={14} className="text-cherry" />
                          <span className="flex-1 text-xs font-semibold text-cherry-dark">{r.label}</span>
                          <button onClick={() => removeResource(r.id)} aria-label="Quitar recurso" className="text-ink opacity-40 hover:opacity-80">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {r.kind === 'text' && (
                          <input
                            className="mt-2 w-full rounded-[var(--radius-sm)] border border-soft px-2.5 py-1.5 text-sm"
                            value={r.text ?? ''}
                            maxLength={40}
                            onChange={e => patchResource(r.id, { text: e.target.value })}
                            placeholder="Texto que aparece"
                          />
                        )}
                        {r.kind === 'number' && (
                          <input
                            className="mt-2 w-24 rounded-[var(--radius-sm)] border border-soft px-2.5 py-1.5 text-sm"
                            value={r.text ?? '1'}
                            maxLength={2}
                            onChange={e => patchResource(r.id, { text: e.target.value.replace(/[^0-9]/g, '') || '1' })}
                          />
                        )}
                        {r.kind === 'clip' && r.src && (
                          <div className="mt-2">
                            <label className="block text-[11px] text-ink opacity-60">Momento del video original: {fmt(r.src.start)}</label>
                            <input
                              type="range" min={0} max={Math.max(0.1, duration - 2.5)} step={0.1}
                              value={r.src.start}
                              onChange={e => {
                                const start = Number(e.target.value)
                                patchResource(r.id, { src: { start, end: start + 2.2 } })
                              }}
                              className="w-full accent-[var(--color-cherry)]"
                            />
                          </div>
                        )}
                        <div className="mt-2">
                          <label className="block text-[11px] text-ink opacity-60">Aparece en el segundo {fmt(r.showStart)} del reel</label>
                          <input
                            type="range" min={0} max={Math.max(0.1, finalDuration - RESOURCE_DUR)} step={0.1}
                            value={r.showStart}
                            onChange={e => {
                              const s = Number(e.target.value)
                              patchResource(r.id, { showStart: s, showEnd: s + RESOURCE_DUR })
                            }}
                            className="w-full accent-[var(--color-cherry)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB subtítulos */}
            {tab === 'subtitulos' && (
              <div className="mt-4">
                <p className="text-xs text-ink opacity-60">Palabra a palabra, estilo BRAVE: blancas, minúsculas, a la altura del 65%. Se queman en el video.</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => setCaptionsOn(v => !v)}
                    aria-label="Alternar subtítulos"
                    className={['relative h-6 w-11 rounded-full transition-colors', captionsOn ? 'bg-cherry' : 'bg-[var(--color-warm-gray)]'].join(' ')}
                  >
                    <span className={[
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                      captionsOn ? 'left-[22px]' : 'left-0.5',
                    ].join(' ')} />
                  </button>
                  <span className="text-sm text-ink">{captionsOn ? 'Activados' : 'Desactivados'}</span>
                </div>
                <div className="mt-5">
                  <label className="block text-[11px] text-ink opacity-60">Tamaño — {Math.round(capSize * videoSize.h)} px sobre {videoSize.h} de alto</label>
                  <input
                    type="range" min={0.04} max={0.09} step={0.003}
                    value={capSize}
                    onChange={e => setCapSize(Number(e.target.value))}
                    className="mt-1 w-full max-w-xs accent-[var(--color-cherry)]"
                  />
                </div>
                <p className="mt-4 text-[11px] text-ink opacity-45">Tus preferencias quedan guardadas para los próximos reels (marca de fábrica).</p>
              </div>
            )}

            {/* TAB exportar */}
            {tab === 'exportar' && (
              <div className="mt-4">
                <div className="rounded-[var(--radius-sm)] border border-soft p-4">
                  <p className="text-xs font-semibold text-cherry-dark">Lo que hicimos en tu reel</p>
                  <ul className="mt-2 space-y-1 text-xs tabular-nums text-ink opacity-75">
                    <li>· Quitamos {cutGaps.length} silencio{cutGaps.length === 1 ? '' : 's'} ({Math.round(silSec)} s)</li>
                    {cutPhrases.length > 0 && (
                      <li>· Quitamos {cutRepeats.length} frase{cutRepeats.length === 1 ? '' : 's'} repetida{cutRepeats.length === 1 ? '' : 's'} y {cutPhrases.length - cutRepeats.length} sin sentido ({Math.round(phraseSec)} s)</li>
                    )}
                    {wordCuts.length > 0 && <li>· Sacamos {wordCuts.length} muletilla{wordCuts.length === 1 ? '' : 's'} de la voz</li>}
                    <li>· Dejamos subtítulos palabra a palabra: {captionsOn ? 'sí' : 'no'}</li>
                    <li>· Recursos en pantalla: {resources.length === 0 ? 'ninguno' : resources.map(r => r.label).join(', ')}</li>
                    <li>· Crudo {fmt(duration)} → reel final {fmt(finalDuration)}
                      {workSec > 0 ? ` — montado aquí en ${workSec} s` : ''}</li>
                  </ul>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => void exportar()} icon={<Download size={16} />}>Exportar video</Button>
                  <p className="self-center text-[11px] text-ink opacity-50">Se monta aquí mismo, en tu dispositivo (~1-4 min).</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* export */}
      {step === 'export' && (
        <Card className="mt-5">
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 size={28} className="text-cherry animate-spin" />
            <p className="mt-4 font-semibold text-cherry-dark">Montando tu reel…</p>
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-warm-gray)]">
              <div className="h-full bg-cherry transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink opacity-60">{pct}%</p>
            <p className="mt-4 max-w-xs text-xs text-ink opacity-50">
              Cortes, subtítulos y recursos en una sola pasada. Sale en tu dispositivo.
            </p>
          </div>
        </Card>
      )}

      {/* done */}
      {step === 'done' && (
        <Card className="mt-5">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-cherry" />
            <p className="font-semibold text-cherry-dark">Tu reel está listo{duration > 0 ? ` — ${fmt(duration)} → ${fmt(finalDuration)}` : ''}</p>
          </div>
          <video src={resultUrl} controls playsInline className="mx-auto mt-4 max-h-[46vh] rounded-[var(--radius-md)] bg-black" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={resultUrl}
              download={file ? `${file.name.replace(/\.[^.]+$/, '')}-brave.mp4` : 'video-brave.mp4'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all duration-200 rounded-[var(--radius-sm)] bg-cherry text-white hover:bg-cherry-dark hover:shadow-[0_4px_16px_rgba(122,24,50,0.3)]"
            >
              <Download size={16} />
              Descargar MP4
            </a>
            <Button variant="ghost" onClick={() => setStep('editor')}>Ajustar y repetir</Button>
            <Button variant="ghost" onClick={reset}>Editar otro video</Button>
          </div>
        </Card>
      )}
    </div>
  )
}